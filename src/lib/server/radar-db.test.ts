import { addDays } from "date-fns"
import { beforeEach, describe, expect, it } from "vitest"

import { montarGabarito as buildSeed } from "@/lib/data/gabarito-fixture"
import { proximaOportunidade } from "@/lib/domain/opportunities"
import {
  agoraDaConfiguracao,
  contextoDoSnapshot,
  situacoesDaCarteira,
  toISODate,
} from "@/lib/domain/rules"
import type { Acao, RadarSnapshot } from "@/lib/domain/types"
import { BancoFake } from "@/test/banco-fake"

import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroRegra,
} from "./errors"
import {
  acaoDeLinha,
  acaoParaLinha,
  atribuicaoDeLinha,
  checkupDeLinha,
  checkupParaLinha,
  clienteDeLinha,
  clienteParaLinha,
  configuracaoDeLinha,
  contratoDeLinha,
  frenteDeLinha,
  frenteParaLinha,
} from "./mapeamento"
import {
  atribuir,
  atualizarConfiguracao,
  atualizarFrente,
  atualizarStatusAcao,
  carregarSnapshot,
  importarDataset,
  registrarAcao,
  resetar,
  salvarCheckup,
  validarDataset,
} from "./radar-db"

const HOJE = "2026-11-13"
const atras = (dias: number) =>
  toISODate(addDays(new Date(2026, 10, 13, 12), -dias))

describe("mapeamento linhas <-> domínio", () => {
  it("cliente", () => {
    const c = {
      id: "c1",
      nome: "Cliente",
      nicho: "Moda",
      tipo: "loja_em_criacao" as const,
      responsavel: "Squad Alfa",
      ativo: false,
    }
    expect(clienteParaLinha(c)).toEqual({
      id: "c1",
      nome: "Cliente",
      nicho: "Moda",
      tipo: "loja_em_criacao",
      responsavel: "Squad Alfa",
      ativo: false,
    })
    expect(clienteDeLinha(clienteParaLinha(c))).toEqual(c)
  })

  it("frente (snake_case, ordem) e contrato", () => {
    const f = {
      id: "google-ads",
      nome: "Google Ads",
      setor: "Mídia paga" as const,
      prazoDias: 30,
      criticoAposDias: 60,
    }
    expect(frenteParaLinha(f, 3)).toMatchObject({
      prazo_dias: 30,
      critico_apos_dias: 60,
      ordem: 3,
    })
    expect(frenteDeLinha(frenteParaLinha(f, 3))).toEqual(f)
    expect(contratoDeLinha({ cliente_id: "a", frente_id: "b" })).toEqual({
      clientId: "a",
      frenteId: "b",
    })
  })

  it("ação concluída: concluida_em e criada_em preenchidas, aguardando_desde nulo", () => {
    const a: Acao = {
      id: "a1",
      clientId: "c",
      frenteId: "f",
      titulo: "T",
      data: "2026-11-01",
      status: "concluida",
    }
    const l = acaoParaLinha(a)
    expect(l).toMatchObject({
      criada_em: "2026-11-01",
      concluida_em: "2026-11-01",
      aguardando_desde: null,
      origem: "manual",
      responsavel: "",
    })
    expect(acaoDeLinha(l)).toEqual({
      ...a,
      origem: "manual",
      criadaEm: "2026-11-01",
      concluidaEm: "2026-11-01",
    })
  })

  it("ação aguardando: aguardando_desde obrigatório (cai para a data), sem concluida_em", () => {
    const l = acaoParaLinha({
      id: "a2",
      clientId: "c",
      frenteId: "f",
      titulo: "T",
      data: "2026-11-05",
      status: "aguardando_aprovacao",
    })
    expect(l.aguardando_desde).toBe("2026-11-05")
    expect(l.concluida_em).toBeNull()
    expect(acaoDeLinha(l).aguardandoDesde).toBe("2026-11-05")
  })

  it("linha com nulos e responsável vazio vira campos ausentes", () => {
    const a = acaoDeLinha({
      id: "x",
      cliente_id: "c",
      frente_id: "f",
      titulo: "T",
      status: "em_andamento",
      responsavel: "",
      criada_em: null,
      concluida_em: null,
      data: "2026-11-05",
      aguardando_desde: null,
      origem: "seed",
    })
    expect(a).toEqual({
      id: "x",
      clientId: "c",
      frenteId: "f",
      titulo: "T",
      status: "em_andamento",
      data: "2026-11-05",
      origem: "seed",
    })
  })

  it("check-up (resultado nulo) e atribuição", () => {
    const c = { id: "k", clientId: "c", data: HOJE }
    expect(checkupParaLinha(c).resultado_ads).toBeNull()
    expect(checkupDeLinha(checkupParaLinha(c))).toEqual(c)
    expect(
      atribuicaoDeLinha({
        oportunidade_id: "parada:a:b",
        setor: "Mídia paga",
        data: HOJE,
        texto: "x",
      })
    ).toEqual({ oportunidadeId: "parada:a:b", setor: "Mídia paga", data: HOJE, texto: "x" })
  })

  it("configuração: linha -> domínio; sem linha usa o padrão", () => {
    expect(
      configuracaoDeLinha({
        id: 1,
        limite_aprovacao_dias: 7,
        bloqueio_contratual_dias: 120,
        data_referencia: "2026-12-01",
        usar_hoje_real: true,
      })
    ).toEqual({
      limiteAprovacaoDias: 7,
      bloqueioContratualDias: 120,
      dataReferencia: "2026-12-01",
      usarHojeReal: true,
    })
    expect(configuracaoDeLinha(undefined)).toEqual({
      limiteAprovacaoDias: 5,
      bloqueioContratualDias: 90,
      dataReferencia: "2026-11-13",
      usarHojeReal: false,
    })
  })
})

describe("carregarSnapshot / resetar", () => {
  it("banco vazio: snapshot vazio com configuração padrão", async () => {
    const snap = await carregarSnapshot(new BancoFake())
    expect(snap).toMatchObject({
      clients: [],
      frentes: [],
      acoes: [],
      contratos: [],
      configuracao: { limiteAprovacaoDias: 5 },
    })
  })

  it("resetar grava a fixture e o motor reproduz o gabarito sobre o que foi lido do banco", async () => {
    const banco = new BancoFake()
    const snap = await resetar(banco, buildSeed())
    const seed = buildSeed()
    expect(snap.clients).toHaveLength(10)
    expect(snap.frentes.map((f) => f.id)).toEqual(seed.frentes.map((f) => f.id))
    expect(snap.contratos).toHaveLength(39)
    expect(snap.acoes).toHaveLength(seed.acoes.length)
    expect(snap.configuracao).toEqual(seed.configuracao)

    const hoje = agoraDaConfiguracao(snap.configuracao, new Date(2030, 0, 1))
    const sit = situacoesDaCarteira(
      snap.clients,
      snap.frentes,
      snap.acoes,
      hoje,
      contextoDoSnapshot(snap)
    )
    expect(Object.fromEntries(sit)).toEqual({
      "aurora-moda": "critico",
      "ninho-casa-decor": "critico",
      "raiz-organicos": "critico",
      "patas-pet-store": "atencao",
      "vitta-suplementos": "atencao",
      "bella-pele": "atencao",
      techmania: "ok",
      "doce-lar": "ok",
      "mundo-kids": "ok",
      "lumi-acessorios": "ok",
    })
  })

  it("resetar duas vezes dá o mesmo resultado (substitui, não acumula)", async () => {
    const banco = new BancoFake()
    const a = await resetar(banco, buildSeed())
    await atribuir(banco, {
      oportunidadeId: "parada:aurora-moda:crm",
      setor: "CRM & Automação",
      data: HOJE,
      texto: "x",
    })
    await atualizarConfiguracao(banco, { limiteAprovacaoDias: 9 })
    const b = await resetar(banco, buildSeed())
    expect(b).toEqual(a)
    expect(b.atribuicoes).toEqual([])
    expect(b.configuracao.limiteAprovacaoDias).toBe(5)
  })
})

describe("registrarAcao", () => {
  let banco: BancoFake
  beforeEach(async () => {
    banco = new BancoFake()
    await resetar(banco, buildSeed())
  })

  it("grava a ação e resolve o alerta (fluxo da tarefa principal)", async () => {
    const acao = await registrarAcao(banco, {
      clientId: "aurora-moda",
      frenteId: "google-ads",
      titulo: "Otimização de Google Ads feita hoje",
      data: HOJE,
      status: "concluida",
    })
    expect(acao).toMatchObject({ origem: "manual", status: "concluida", concluidaEm: HOJE })
    const snap = await carregarSnapshot(banco)
    expect(snap.acoes.some((a) => a.id === acao.id)).toBe(true)
    const hoje = agoraDaConfiguracao(snap.configuracao, new Date())
    const prox = proximaOportunidade(
      "aurora-moda",
      snap.clients,
      snap.frentes,
      snap.acoes,
      hoje,
      contextoDoSnapshot(snap)
    )
    expect(prox?.id).toBe("parada:aurora-moda:crm")
  })

  it("aguardando aprovação recebe aguardandoDesde; respeita o id enviado pelo cliente", async () => {
    const acao = await registrarAcao(banco, {
      id: "acao-do-cliente-1",
      clientId: "techmania",
      frenteId: "crm",
      titulo: "Fluxo novo",
      data: HOJE,
      status: "aguardando_aprovacao",
      responsavel: "Squad Gama",
    })
    expect(acao).toMatchObject({
      id: "acao-do-cliente-1",
      aguardandoDesde: HOJE,
      responsavel: "Squad Gama",
    })
  })

  it("cliente ou frente inexistente => não encontrado", async () => {
    const base = { titulo: "T", data: HOJE, status: "concluida" as const }
    await expect(
      registrarAcao(banco, { ...base, clientId: "nao-existe", frenteId: "crm" })
    ).rejects.toBeInstanceOf(ErroNaoEncontrado)
    await expect(
      registrarAcao(banco, { ...base, clientId: "techmania", frenteId: "nao-existe" })
    ).rejects.toBeInstanceOf(ErroNaoEncontrado)
  })

  it("frente não contratada => regra inválida (Aurora não contrata CRO)", async () => {
    await expect(
      registrarAcao(banco, {
        clientId: "aurora-moda",
        frenteId: "cro",
        titulo: "T",
        data: HOJE,
        status: "concluida",
      })
    ).rejects.toBeInstanceOf(ErroRegra)
  })

  it("id repetido => conflito", async () => {
    const base = {
      id: "dup",
      clientId: "techmania",
      frenteId: "crm",
      titulo: "T",
      data: HOJE,
      status: "concluida" as const,
    }
    await registrarAcao(banco, base)
    await expect(registrarAcao(banco, base)).rejects.toBeInstanceOf(ErroConflito)
  })

  it("sem contratos cadastrados, qualquer frente vale (compatibilidade)", async () => {
    const vazio = new BancoFake()
    await importarDataset(vazio, {
      ...buildSeed(),
      contratos: undefined,
      acoes: [],
    })
    // Dataset sem contratos materializa todos os pares.
    const acao = await registrarAcao(vazio, {
      clientId: "aurora-moda",
      frenteId: "cro",
      titulo: "T",
      data: HOJE,
      status: "concluida",
    })
    expect(acao.frenteId).toBe("cro")
  })
})

describe("atualizarStatusAcao", () => {
  let banco: BancoFake
  beforeEach(async () => {
    banco = new BancoFake()
    await resetar(banco, buildSeed())
  })

  it("aguardando -> concluída limpa aguardandoDesde e preenche concluidaEm", async () => {
    const id = "seed-bella-pele-materiais-aguardando-0"
    const acao = await atualizarStatusAcao(banco, id, "concluida")
    expect(acao.status).toBe("concluida")
    expect(acao.aguardandoDesde).toBeUndefined()
    expect(acao.concluidaEm).toBe(acao.data)
    const linha = banco.tabelas.acoes.find((l) => l.id === id)
    expect(linha).toMatchObject({ status: "concluida", aguardando_desde: null })
  })

  it("concluída -> aguardando mantém o check do banco (aguardando_desde preenchido)", async () => {
    const id = "seed-techmania-crm-0"
    const acao = await atualizarStatusAcao(banco, id, "aguardando_aprovacao")
    expect(acao.aguardandoDesde).toBe(acao.data)
    expect(banco.tabelas.acoes.find((l) => l.id === id)).toMatchObject({
      status: "aguardando_aprovacao",
      concluida_em: null,
    })
  })

  it("ação inexistente => não encontrado", async () => {
    await expect(atualizarStatusAcao(banco, "nao-existe", "concluida")).rejects.toBeInstanceOf(
      ErroNaoEncontrado
    )
  })
})

describe("salvarCheckup", () => {
  let banco: BancoFake
  beforeEach(async () => {
    banco = new BancoFake()
    await resetar(banco, buildSeed())
  })
  const doCliente = (clientId: string, frenteId: string) =>
    banco.tabelas.acoes.filter(
      (l) => l.cliente_id === clientId && l.frente_id === frenteId && l.status === "concluida"
    )

  it("data mais recente: insere uma ação de check-up e registra o check-up", async () => {
    const antes = banco.tabelas.acoes.length
    const r = await salvarCheckup(banco, {
      clientId: "aurora-moda",
      data: HOJE,
      entradas: [{ frenteId: "google-ads", data: atras(1) }],
      resultadoAds: "caindo",
    })
    expect(r.alteradas).toEqual(["google-ads"])
    expect(banco.tabelas.acoes).toHaveLength(antes + 1)
    expect(banco.tabelas.checkups.find((c) => c.id === r.checkup.id)).toMatchObject({
      cliente_id: "aurora-moda",
      resultado_ads: "caindo",
      data: HOJE,
    })
    const nova = r.acoes.find((a) => a.origem === "checkup")
    expect(nova).toMatchObject({ frenteId: "google-ads", data: atras(1), status: "concluida" })
  })

  it("data mais ANTIGA corrige o histórico: remove as concluídas posteriores e insere a do check-up", async () => {
    // TechMania/Google Ads tem concluídas há 10 e 35 dias; informar 100 remove ambas.
    expect(doCliente("techmania", "google-ads")).toHaveLength(2)
    const r = await salvarCheckup(banco, {
      clientId: "techmania",
      data: HOJE,
      entradas: [{ frenteId: "google-ads", data: atras(100) }],
    })
    const restantes = doCliente("techmania", "google-ads")
    expect(restantes).toHaveLength(1)
    expect(restantes[0]).toMatchObject({ data: atras(100), origem: "checkup" })
    expect(r.alteradas).toEqual(["google-ads"])
    // As ações devolvidas são as do cliente depois do diff.
    expect(
      r.acoes.filter((a) => a.frenteId === "google-ads" && a.status === "concluida")
    ).toHaveLength(1)
  })

  it("data igual à atual ou vazia: nada muda nas ações, mas o check-up é registrado", async () => {
    const antes = banco.tabelas.acoes.length
    const r = await salvarCheckup(banco, {
      clientId: "aurora-moda",
      data: HOJE,
      entradas: [
        { frenteId: "google-ads", data: atras(69) },
        { frenteId: "crm", data: "" },
      ],
    })
    expect(r.alteradas).toEqual([])
    expect(banco.tabelas.acoes).toHaveLength(antes)
    expect(banco.tabelas.checkups.some((c) => c.id === r.checkup.id)).toBe(true)
  })

  it("ignora frentes não contratadas pelo cliente", async () => {
    const r = await salvarCheckup(banco, {
      clientId: "aurora-moda",
      data: HOJE,
      entradas: [{ frenteId: "cro", data: atras(3) }],
    })
    expect(r.alteradas).toEqual([])
  })

  it("cliente inexistente => não encontrado; id de check-up repetido => conflito", async () => {
    await expect(
      salvarCheckup(banco, { clientId: "nao-existe", data: HOJE, entradas: [] })
    ).rejects.toBeInstanceOf(ErroNaoEncontrado)
    await salvarCheckup(banco, { id: "chk-1", clientId: "techmania", data: HOJE, entradas: [] })
    await expect(
      salvarCheckup(banco, { id: "chk-1", clientId: "techmania", data: HOJE, entradas: [] })
    ).rejects.toBeInstanceOf(ErroConflito)
  })
})

describe("atualizarFrente / atribuir / atualizarConfiguracao", () => {
  let banco: BancoFake
  beforeEach(async () => {
    banco = new BancoFake()
    await resetar(banco, buildSeed())
  })

  it("atualiza prazo e limite crítico", async () => {
    const f = await atualizarFrente(banco, "google-ads", { prazoDias: 40, criticoAposDias: 80 })
    expect(f).toMatchObject({ prazoDias: 40, criticoAposDias: 80 })
    expect(banco.tabelas.frentes.find((l) => l.id === "google-ads")).toMatchObject({
      prazo_dias: 40,
      critico_apos_dias: 80,
    })
  })

  it("só o prazo: mantém o limite crítico atual", async () => {
    const f = await atualizarFrente(banco, "google-ads", { prazoDias: 45 })
    expect(f).toMatchObject({ prazoDias: 45, criticoAposDias: 60 })
  })

  it("limite crítico <= prazo => regra inválida e nada é gravado", async () => {
    await expect(atualizarFrente(banco, "google-ads", { prazoDias: 60 })).rejects.toBeInstanceOf(
      ErroRegra
    )
    expect(banco.tabelas.frentes.find((l) => l.id === "google-ads")).toMatchObject({
      prazo_dias: 30,
    })
  })

  it("frente inexistente => não encontrado", async () => {
    await expect(atualizarFrente(banco, "x", { prazoDias: 10 })).rejects.toBeInstanceOf(
      ErroNaoEncontrado
    )
  })

  it("atribuir é por oportunidade: a segunda substitui a primeira", async () => {
    const base = { oportunidadeId: "parada:aurora-moda:crm", data: HOJE }
    await atribuir(banco, { ...base, setor: "CRM & Automação", texto: "um" })
    await atribuir(banco, { ...base, setor: "Mídia paga", texto: "dois" })
    expect(banco.tabelas.atribuicoes).toHaveLength(1)
    expect(banco.tabelas.atribuicoes[0]).toMatchObject({ setor: "Mídia paga", texto: "dois" })
  })

  it("configuração: mescla parcial e persiste", async () => {
    const c = await atualizarConfiguracao(banco, { limiteAprovacaoDias: 7, usarHojeReal: true })
    expect(c).toEqual({
      limiteAprovacaoDias: 7,
      bloqueioContratualDias: 90,
      dataReferencia: "2026-11-13",
      usarHojeReal: true,
    })
    expect((await carregarSnapshot(banco)).configuracao).toEqual(c)
    expect(banco.tabelas.configuracoes).toHaveLength(1)
  })
})

describe("importarDataset", () => {
  const pequeno = (): RadarSnapshot => ({
    clients: [
      { id: "c1", nome: "Um", nicho: "X", tipo: "operacao", responsavel: "S", ativo: true },
    ],
    frentes: [
      { id: "f1", nome: "F1", setor: "Mídia paga", prazoDias: 10, criticoAposDias: 20 },
    ],
    contratos: [{ clientId: "c1", frenteId: "f1" }],
    acoes: [
      { id: "a1", clientId: "c1", frenteId: "f1", titulo: "T", data: HOJE, status: "concluida" },
    ],
    checkups: [],
    atribuicoes: [],
    configuracao: {
      limiteAprovacaoDias: 3,
      bloqueioContratualDias: 45,
      dataReferencia: "2026-12-01",
      usarHojeReal: false,
    },
  })

  it("substitui o conteúdo anterior, grava a configuração e marca origem 'planilha'", async () => {
    const banco = new BancoFake()
    await resetar(banco, buildSeed())
    const snap = await importarDataset(banco, pequeno())
    expect(snap.clients.map((c) => c.id)).toEqual(["c1"])
    expect(snap.frentes.map((f) => f.id)).toEqual(["f1"])
    expect(snap.acoes).toHaveLength(1)
    expect(snap.acoes[0].origem).toBe("planilha")
    expect(snap.configuracao.limiteAprovacaoDias).toBe(3)
    expect(snap.atribuicoes).toEqual([])
  })

  it("dataset inconsistente é recusado ANTES de tocar no banco", async () => {
    const banco = new BancoFake()
    await resetar(banco, buildSeed())
    const antes = await carregarSnapshot(banco)
    const chamadasAntes = banco.chamadas.length
    const ruim = pequeno()
    ruim.acoes[0].clientId = "fantasma"
    await expect(importarDataset(banco, ruim)).rejects.toBeInstanceOf(ErroRegra)
    expect(banco.chamadas.length).toBe(chamadasAntes) // nenhuma leitura/escrita
    expect(await carregarSnapshot(banco)).toEqual(antes)
  })

  it("falha no meio da gravação restaura o conteúdo anterior e relança o erro", async () => {
    const banco = new BancoFake()
    await resetar(banco, buildSeed())
    const antes = await carregarSnapshot(banco)
    banco.falharEm("inserir", "acoes") // limpou tudo, regravou pais, falha nas ações
    await expect(importarDataset(banco, pequeno())).rejects.toThrow(/falha injetada/)
    expect(await carregarSnapshot(banco)).toEqual(antes)
  })

  it("validarDataset: ids repetidos e contratos órfãos", () => {
    const d = pequeno()
    d.clients.push({ ...d.clients[0] })
    expect(() => validarDataset(d)).toThrow(ErroRegra)
    const e = pequeno()
    e.contratos = [{ clientId: "c1", frenteId: "zz" }]
    expect(() => validarDataset(e)).toThrow(ErroRegra)
  })
})
