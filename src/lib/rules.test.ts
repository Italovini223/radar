import { addDays } from "date-fns"
import { describe, expect, it } from "vitest"

import { gerarRascunhoSincrono, AVISO_RASCUNHO } from "./ai/proposal"
import { aplicarCheckup } from "./domain/checkup"
import {
  alertasDoCliente,
  calcularMetricas,
  derivarOportunidades,
  formatarDias,
  proximaOportunidade,
  textoBloqueio,
} from "./domain/opportunities"
import {
  DIAS_APROVACAO_TRAVADA,
  acoesTravadas,
  agoraDaConfiguracao,
  avaliarFrente,
  avisosDoCliente,
  classificarDias,
  contextoDoSnapshot,
  montarGrade,
  situacaoDoCliente,
  toISODate,
  ultimaAcaoConcluida,
} from "./domain/rules"
import type { Acao, Frente } from "./domain/types"
import { montarGabarito as buildSeed } from "./data/gabarito-fixture"

/** "Hoje" do gabarito: 13/11/2026 (meio-dia local, para evitar bordas de fuso). */
const NOW = new Date(2026, 10, 13, 12, 0, 0)
const atras = (dias: number) => toISODate(addDays(NOW, -dias))

const frente = (prazoDias: number, criticoAposDias = prazoDias * 2): Frente => ({
  id: "f",
  nome: "Frente",
  setor: "Mídia paga",
  prazoDias,
  criticoAposDias,
})

const acao = (
  dias: number,
  extra: Partial<Acao> = {}
): Acao => ({
  id: `a-${dias}-${Math.random()}`,
  clientId: "c",
  frenteId: "f",
  titulo: "Ação",
  data: atras(dias),
  status: "concluida",
  ...extra,
})

describe("classificarDias: atenção 75% / atrasada > prazo / crítica >= criticoAposDias", () => {
  // prazo 100 / crítico 200 deixa os limites em números redondos
  it.each([
    [0, "em_dia"],
    [74, "em_dia"],
    [75, "atencao"], // exatamente 75% já é atenção (aviso)
    [100, "atencao"], // exatamente o prazo ainda é atenção
    [101, "atrasada"],
    [199, "atrasada"],
    [200, "critica"], // "vira crítico após": dias >= criticoAposDias
    [201, "critica"],
  ] as const)("prazo 100 / crítico 200, %i dias => %s", (dias, esperado) => {
    expect(classificarDias(dias, 100, 200)).toEqual({
      estado: esperado,
      nunca: false,
    })
  })

  it("o limiar crítico é a coluna própria, não 1,5x: prazo 30 / crítico 45 mantém os números do motor antigo", () => {
    expect(classificarDias(22, 30, 45).estado).toBe("em_dia")
    expect(classificarDias(23, 30, 45).estado).toBe("atencao")
    expect(classificarDias(30, 30, 45).estado).toBe("atencao")
    expect(classificarDias(31, 30, 45).estado).toBe("atrasada")
    expect(classificarDias(44, 30, 45).estado).toBe("atrasada")
    expect(classificarDias(45, 30, 45).estado).toBe("critica")
  })

  it("prazo 30 / crítico 60 (Google Ads da planilha)", () => {
    expect(classificarDias(59, 30, 60).estado).toBe("atrasada")
    expect(classificarDias(60, 30, 60).estado).toBe("critica")
    expect(classificarDias(46, 30, 60).estado).toBe("atrasada") // antes: crítica (> 150%)
  })

  it("sem criticoAposDias informado, assume 2x o prazo", () => {
    expect(classificarDias(59, 30).estado).toBe("atrasada")
    expect(classificarDias(60, 30).estado).toBe("critica")
  })

  it("nunca teve ação => crítica, marcada como nunca", () => {
    expect(classificarDias(null, 30, 60)).toEqual({ estado: "critica", nunca: true })
    expect(classificarDias(null, 365, 730)).toEqual({ estado: "critica", nunca: true })
  })
})

describe("avaliarFrente", () => {
  it("usa a última ação CONCLUÍDA; em andamento e aguardando não contam", () => {
    const acoes = [
      acao(50),
      acao(2, { status: "em_andamento" }),
      acao(1, { status: "aguardando_aprovacao", aguardandoDesde: atras(1) }),
    ]
    expect(ultimaAcaoConcluida(acoes, "c", "f")?.data).toBe(atras(50))
    const s = avaliarFrente(acoes, "c", frente(30), NOW)
    expect(s.dias).toBe(50)
    // Motor antigo: crítica (50 > 150% de 30). Agora: prazo 30 / crítico 60.
    expect(s.estado).toBe("atrasada")
    expect(s.nunca).toBe(false)
    expect(avaliarFrente(acoes, "c", frente(30, 50), NOW).estado).toBe("critica")
  })

  it("sem nenhuma ação concluída é 'nunca' e crítica", () => {
    const s = avaliarFrente([], "c", frente(30), NOW)
    expect(s).toMatchObject({ nunca: true, dias: null, estado: "critica" })
  })

  it("mudar o prazo reclassifica o par", () => {
    const acoes = [acao(40)]
    expect(avaliarFrente(acoes, "c", frente(30), NOW).estado).toBe("atrasada")
    expect(avaliarFrente(acoes, "c", frente(50), NOW).estado).toBe("atencao")
    expect(avaliarFrente(acoes, "c", frente(60), NOW).estado).toBe("em_dia")
  })
})

describe("aprovação travada (> 5 dias, parametrizável)", () => {
  const aguardando = (dias: number) =>
    acao(dias, {
      status: "aguardando_aprovacao",
      aguardandoDesde: atras(dias),
    })

  it("limite padrão: 5 dias não alerta, 6 dias alerta (antes: 7/8)", () => {
    expect(DIAS_APROVACAO_TRAVADA).toBe(5)
    expect(acoesTravadas([aguardando(5)], NOW)).toHaveLength(0)
    expect(acoesTravadas([aguardando(6)], NOW)).toHaveLength(1)
  })

  it("o limite vem da configuração", () => {
    expect(acoesTravadas([aguardando(8)], NOW, 10)).toHaveLength(0)
    expect(acoesTravadas([aguardando(11)], NOW, 10)).toHaveLength(1)
    const s = avaliarFrente([acao(5), aguardando(8)], "c", frente(30), NOW, {
      limiteAprovacaoDias: 10,
    })
    expect(s.travada).toBe(false)
  })

  it("só considera status aguardando_aprovacao", () => {
    expect(acoesTravadas([acao(30), acao(30, { status: "em_andamento" })], NOW)).toHaveLength(0)
  })

  it("marca o par como travado na grade sem mudar o estado por prazo", () => {
    const s = avaliarFrente([acao(5), aguardando(10)], "c", frente(30), NOW)
    expect(s.travada).toBe(true)
    expect(s.estado).toBe("em_dia")
  })
})

describe("loja em criação (desenvolvimento): relógio de retorno do cliente", () => {
  const dev: Frente = {
    id: "desenvolvimento",
    nome: "Desenvolvimento · loja em criação",
    setor: "Desenvolvimento",
    prazoDias: 30,
    criticoAposDias: 60,
  }
  const doDev = (dias: number, extra: Partial<Acao> = {}) =>
    acao(dias, { frenteId: "desenvolvimento", ...extra })
  const aguardandoDev = (dias: number) =>
    doDev(dias, { status: "aguardando_aprovacao", aguardandoDesde: atras(dias) })
  const loja = { tipoCliente: "loja_em_criacao" as const }

  it.each([
    [10, "em_dia", 80],
    [23, "atencao", 67],
    [30, "atencao", 60],
    [31, "atrasada", 59],
    [59, "atrasada", 31],
    [60, "critica", 30],
    [66, "critica", 24],
    [90, "critica", 0],
    [100, "critica", -10],
  ] as const)("aguardando há %i dias => %s, diasParaBloqueio %i", (dias, estado, bloqueio) => {
    const s = avaliarFrente([aguardandoDev(dias)], "c", dev, NOW, loja)
    expect(s).toMatchObject({
      estado,
      dias,
      diasParaBloqueio: bloqueio,
      relogio: "retorno_cliente",
      travada: false,
      nunca: false,
    })
  })

  it("o relógio é a ação aguardando MAIS ANTIGA; follow-ups concluídos não o reiniciam", () => {
    const acoes = [
      doDev(40),
      doDev(12),
      aguardandoDev(20),
      aguardandoDev(66),
    ]
    const s = avaliarFrente(acoes, "c", dev, NOW, loja)
    expect(s.dias).toBe(66)
    expect(s.diasParaBloqueio).toBe(24)
    expect(s.aguardandoDesde).toBe(atras(66))
  })

  it("o limite de bloqueio vem da configuração", () => {
    const s = avaliarFrente([aguardandoDev(66)], "c", dev, NOW, {
      ...loja,
      bloqueioContratualDias: 120,
    })
    expect(s.diasParaBloqueio).toBe(54)
  })

  it("sem ação aguardando, cai na regra geral (última concluída)", () => {
    const s = avaliarFrente([doDev(40)], "c", dev, NOW, loja)
    expect(s).toMatchObject({
      relogio: "ultima_acao",
      dias: 40,
      estado: "atrasada",
      diasParaBloqueio: null,
    })
  })

  it("cliente de operação na mesma frente usa a regra geral e a aprovação travada de 5 dias", () => {
    const s = avaliarFrente([doDev(5), aguardandoDev(20)], "c", dev, NOW, {
      tipoCliente: "operacao",
    })
    expect(s.relogio).toBe("ultima_acao")
    expect(s.diasParaBloqueio).toBeNull()
    expect(s.travada).toBe(true)
  })

  it("a aprovação travada de 5 dias NÃO se aplica a loja em criação x desenvolvimento", () => {
    const s = avaliarFrente([aguardandoDev(8)], "c", dev, NOW, loja)
    expect(s.travada).toBe(false)
    expect(s.estado).toBe("em_dia")
  })

  it("textoBloqueio", () => {
    expect(textoBloqueio(24)).toBe("faltam 24 dias para o bloqueio contratual")
    expect(textoBloqueio(1)).toBe("falta 1 dia para o bloqueio contratual")
    expect(textoBloqueio(0)).toBe("bloqueio contratual atingido hoje")
    expect(textoBloqueio(-10)).toBe("bloqueio contratual atingido há 10 dias")
  })
})

describe("agoraDaConfiguracao", () => {
  const hojeReal = new Date(2026, 10, 23, 9, 0, 0)
  it("usa a data de referência por padrão", () => {
    const d = agoraDaConfiguracao(
      { dataReferencia: "2026-11-13", usarHojeReal: false },
      hojeReal
    )
    expect(toISODate(d)).toBe("2026-11-13")
  })
  it("usarHojeReal ignora a data de referência", () => {
    expect(
      agoraDaConfiguracao({ dataReferencia: "2026-11-13", usarHojeReal: true }, hojeReal)
    ).toBe(hojeReal)
  })
  it("data de referência inválida cai na data real", () => {
    expect(
      agoraDaConfiguracao({ dataReferencia: "xx", usarHojeReal: false }, hojeReal)
    ).toBe(hojeReal)
  })
})

describe("fixture do gabarito + oráculo dos gargalos (regras da planilha)", () => {
  const seed = buildSeed()
  const ctx = contextoDoSnapshot(seed)
  const grade = montarGrade(seed.clients, seed.frentes, seed.acoes, NOW, ctx)
  const opps = () => derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW, ctx)
  const celula = (clientId: string, frenteId: string) => {
    const s = grade.find((g) => g.clientId === clientId && g.frenteId === frenteId)
    if (!s) throw new Error(`célula ausente: ${clientId}/${frenteId}`)
    return s
  }

  it("10 clientes x 8 frentes; a grade só tem os pares contratados", () => {
    expect(seed.clients).toHaveLength(10)
    expect(seed.frentes).toHaveLength(8)
    expect(seed.contratos).toHaveLength(39)
    expect(grade).toHaveLength(39)
  })

  it("sem contratos no snapshot, todas as frentes valem (compatibilidade)", () => {
    expect(montarGrade(seed.clients, seed.frentes, seed.acoes, NOW)).toHaveLength(80)
  })

  it("prazos e 'vira crítico após' por frente (planilha)", () => {
    const prazos = Object.fromEntries(
      seed.frentes.map((f) => [f.id, [f.prazoDias, f.criticoAposDias]])
    )
    expect(prazos).toEqual({
      "google-ads": [30, 60],
      "meta-ads": [15, 30],
      crm: [60, 120],
      conteudo: [14, 28],
      materiais: [30, 60],
      redacao: [30, 60],
      desenvolvimento: [30, 60],
      cro: [180, 360],
    })
  })

  it("Aurora Moda: Google Ads 69 d crítica; CRM 85 d atrasada", () => {
    expect(celula("aurora-moda", "google-ads")).toMatchObject({ estado: "critica", dias: 69 })
    expect(celula("aurora-moda", "crm")).toMatchObject({ estado: "atrasada", dias: 85 })
  })

  it("Ninho: CRM 156 d e CRO ~13 meses => críticas", () => {
    expect(celula("ninho-casa-decor", "crm")).toMatchObject({ estado: "critica", dias: 156 })
    expect(celula("ninho-casa-decor", "cro")).toMatchObject({ estado: "critica", dias: 389 })
  })

  it("frente não contratada nunca vira 'nunca teve ação'", () => {
    expect(grade.some((g) => g.clientId === "aurora-moda" && g.frenteId === "cro")).toBe(false)
    expect(grade.filter((g) => g.nunca)).toEqual([])
    expect(opps().some((o) => o.clientId === "raiz-organicos" && o.frenteId !== "desenvolvimento")).toBe(false)
  })

  it("o Radar lista EXATAMENTE as 9 oportunidades esperadas", () => {
    expect(opps().map((o) => o.id).sort()).toEqual(
      [
        "aprovacao:aurora-moda:meta-ads",
        "aprovacao:bella-pele:materiais",
        "parada:aurora-moda:crm",
        "parada:aurora-moda:google-ads",
        "parada:ninho-casa-decor:crm",
        "parada:ninho-casa-decor:cro",
        "parada:patas-pet-store:google-ads",
        "parada:raiz-organicos:desenvolvimento",
        "parada:vitta-suplementos:conteudo",
      ].sort()
    )
  })

  it("severidade: crítica = alta; atrasada e aprovação travada = média", () => {
    const por = Object.fromEntries(opps().map((o) => [o.id, o]))
    for (const id of [
      "parada:ninho-casa-decor:crm",
      "parada:ninho-casa-decor:cro",
      "parada:aurora-moda:google-ads",
      "parada:raiz-organicos:desenvolvimento",
    ]) {
      expect(por[id].severidade).toBe("alta")
    }
    for (const id of [
      "parada:aurora-moda:crm",
      "parada:patas-pet-store:google-ads",
      "parada:vitta-suplementos:conteudo",
      "aprovacao:aurora-moda:meta-ads",
      "aprovacao:bella-pele:materiais",
    ]) {
      expect(por[id].severidade).toBe("media")
    }
  })

  it("ordenação: altas primeiro, paradas antes de aprovações, pior razão dias/prazo primeiro", () => {
    expect(opps().map((o) => o.id)).toEqual([
      "parada:ninho-casa-decor:crm", // 156/60
      "parada:aurora-moda:google-ads", // 69/30
      "parada:raiz-organicos:desenvolvimento", // 66/30
      "parada:ninho-casa-decor:cro", // 389/180
      "parada:patas-pet-store:google-ads", // 54/30
      "parada:vitta-suplementos:conteudo", // 24/14
      "parada:aurora-moda:crm", // 85/60
      "aprovacao:aurora-moda:meta-ads", // 9/5
      "aprovacao:bella-pele:materiais", // 6/5
    ])
  })

  it("setor responsável vem da frente", () => {
    const setor = (id: string) => opps().find((o) => o.id === id)?.setorResponsavel
    expect(setor("parada:ninho-casa-decor:crm")).toBe("CRM & Automação")
    expect(setor("parada:ninho-casa-decor:cro")).toBe("CRO & UX")
    expect(setor("parada:aurora-moda:google-ads")).toBe("Mídia paga")
    expect(setor("parada:raiz-organicos:desenvolvimento")).toBe("Desenvolvimento")
  })

  it("'nova' = venceu o prazo há até 14 dias (aprovação: passou do limite há até 14)", () => {
    const nova = (id: string) => opps().find((o) => o.id === id)?.nova
    expect(nova("parada:vitta-suplementos:conteudo")).toBe(true) // 24 - 14 = 10
    expect(nova("parada:patas-pet-store:google-ads")).toBe(false) // 54 - 30 = 24
    expect(nova("parada:ninho-casa-decor:crm")).toBe(false)
    expect(nova("aprovacao:aurora-moda:meta-ads")).toBe(true) // 9 - 5 = 4
  })

  it("métricas calculadas", () => {
    expect(calcularMetricas(seed.clients, seed.frentes, seed.acoes, NOW, ctx)).toMatchObject({
      clientesAtivos: 10,
      clientesCriticos: 3,
      clientesAtencao: 3,
      clientesOk: 4,
      oportunidades: 9,
      clientesComOportunidade: 6,
      novas: 3,
      prioritarias: 4,
      frentesCriticas: 4,
      aguardandoAprovacao: 9,
      aprovacaoTravada: 5, // Aurora (2) + Bella (3); Raiz não conta (regra de loja)
    })
  })

  it("cliente inativo some da grade e das oportunidades", () => {
    const clients = seed.clients.map((c) =>
      c.id === "ninho-casa-decor" ? { ...c, ativo: false } : c
    )
    const r = derivarOportunidades(clients, seed.frentes, seed.acoes, NOW, ctx)
    expect(r.some((o) => o.clientId === "ninho-casa-decor")).toBe(false)
    expect(montarGrade(clients, seed.frentes, seed.acoes, NOW, ctx)).toHaveLength(35)
  })

  it("registrar uma ação resolve a oportunidade (par volta a em dia)", () => {
    const acoes: Acao[] = [
      ...seed.acoes,
      {
        id: "nova",
        clientId: "aurora-moda",
        frenteId: "google-ads",
        titulo: "Otimização de Google Ads feita hoje",
        data: atras(0),
        status: "concluida",
      },
    ]
    const r = derivarOportunidades(seed.clients, seed.frentes, acoes, NOW, ctx)
    expect(r.some((o) => o.id === "parada:aurora-moda:google-ads")).toBe(false)
    expect(r).toHaveLength(8)
    // A próxima oportunidade do Aurora passa a ser o CRM atrasado.
    expect(
      proximaOportunidade("aurora-moda", seed.clients, seed.frentes, acoes, NOW, ctx)?.id
    ).toBe("parada:aurora-moda:crm")
  })

  it("mudar o prazo de Google Ads para 60/120 tira Patas Pet Store do Radar", () => {
    const frentes = seed.frentes.map((f) =>
      f.id === "google-ads" ? { ...f, prazoDias: 60, criticoAposDias: 120 } : f
    )
    const r = derivarOportunidades(seed.clients, frentes, seed.acoes, NOW, ctx)
    expect(r.some((o) => o.id === "parada:patas-pet-store:google-ads")).toBe(false)
    expect(situacaoDoCliente("patas-pet-store", seed.clients, frentes, seed.acoes, NOW, ctx)).toBe("ok")
  })

  it("é determinístico para o mesmo 'hoje' e muda com outro 'hoje'", () => {
    const a = opps()
    const b = opps()
    expect(a).toEqual(b)
    const depois = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, addDays(NOW, 60), ctx)
    expect(depois.length).toBeGreaterThan(a.length)
  })

  it("alertas e avisos por cliente", () => {
    expect(
      alertasDoCliente("aurora-moda", seed.clients, seed.frentes, seed.acoes, NOW, ctx).map((o) => o.id)
    ).toEqual([
      "parada:aurora-moda:google-ads",
      "parada:aurora-moda:crm",
      "aprovacao:aurora-moda:meta-ads",
    ])
    expect(
      avisosDoCliente("mundo-kids", seed.clients, seed.frentes, seed.acoes, NOW, ctx)
        .map((g) => g.frenteId)
        .sort()
    ).toEqual(["cro", "redacao"])
  })
})

describe("aplicarCheckup", () => {
  const seed = buildSeed()
  const google = seed.frentes.find((f) => f.id === "google-ads")!
  const crm = seed.frentes.find((f) => f.id === "crm")!

  it("data mais recente: nova ação concluída e par sai do Radar", () => {
    const r = aplicarCheckup(seed.acoes, seed.frentes, "aurora-moda", [
      { frenteId: "google-ads", data: atras(1) },
    ])
    expect(r.alteradas).toEqual(["google-ads"])
    const s = avaliarFrente(r.acoes, "aurora-moda", google, NOW)
    expect(s.dias).toBe(1)
    expect(s.estado).toBe("em_dia")
  })

  it("data igual à atual ou vazia: nada muda", () => {
    const r = aplicarCheckup(seed.acoes, seed.frentes, "aurora-moda", [
      { frenteId: "google-ads", data: atras(69) },
      { frenteId: "crm", data: "" },
    ])
    expect(r.alteradas).toEqual([])
    expect(r.acoes).toHaveLength(seed.acoes.length)
  })

  it("data mais antiga: corrige o histórico e piora o estado", () => {
    const r = aplicarCheckup(seed.acoes, seed.frentes, "techmania", [
      { frenteId: "google-ads", data: atras(100) },
    ])
    const s = avaliarFrente(r.acoes, "techmania", google, NOW)
    expect(s.dias).toBe(100)
    expect(s.estado).toBe("critica")
  })

  it("frente sem ação (Ninho/CRM sem histórico): informar uma data tira de 'nunca'", () => {
    const semCrm = seed.acoes.filter(
      (a) => !(a.clientId === "ninho-casa-decor" && a.frenteId === "crm")
    )
    expect(avaliarFrente(semCrm, "ninho-casa-decor", crm, NOW).nunca).toBe(true)
    const r = aplicarCheckup(semCrm, seed.frentes, "ninho-casa-decor", [
      { frenteId: "crm", data: atras(5) },
    ])
    const s = avaliarFrente(r.acoes, "ninho-casa-decor", crm, NOW)
    expect(s).toMatchObject({ nunca: false, dias: 5, estado: "em_dia" })
  })
})

describe("gerador simulado de rascunho", () => {
  const seed = buildSeed()
  const opps = derivarOportunidades(
    seed.clients,
    seed.frentes,
    seed.acoes,
    NOW,
    contextoDoSnapshot(seed)
  )

  it("sempre carrega o aviso de rascunho e o setor da frente", () => {
    for (const o of opps) {
      const cliente = seed.clients.find((c) => c.id === o.clientId)!
      const f = seed.frentes.find((x) => x.id === o.frenteId)!
      const p = gerarRascunhoSincrono({
        oportunidade: o,
        clienteNome: cliente.nome,
        frenteNome: f.nome,
        setor: f.setor,
        tituloAcao: "Textos da campanha de Natal",
      })
      expect(p.aviso).toBe(AVISO_RASCUNHO)
      expect(p.geradoPor).toBe("simulado")
      expect(p.setorSugerido).toBe(f.setor)
      expect(p.texto).toContain(cliente.nome)
      expect(p.texto).not.toMatch(/R\$/)
    }
  })

  it("traz os números que o Radar calculou (dias parados e prazo) e não abre com 'Oi, time'", () => {
    for (const o of opps) {
      const cliente = seed.clients.find((c) => c.id === o.clientId)!
      const f = seed.frentes.find((x) => x.id === o.frenteId)!
      const p = gerarRascunhoSincrono({
        oportunidade: o,
        clienteNome: cliente.nome,
        frenteNome: f.nome,
        setor: f.setor,
        tituloAcao: "Textos da campanha de Natal",
      })
      expect(p.texto).not.toMatch(/Oi, time/)
      if (o.tipo === "aprovacao") {
        expect(p.texto).toContain(formatarDias(o.diasParado ?? 0))
        expect(p.texto).toContain("5 dias")
      } else {
        expect(p.texto).toContain(`${o.prazoDias} dias`)
        if (!o.nunca) expect(p.texto).toContain(formatarDias(o.diasParado ?? 0))
      }
    }
  })

  it("a pergunta final varia por frente", () => {
    const frentes = seed.frentes
    const perguntas = frentes.map((f) => {
      const o = {
        ...opps[0],
        tipo: "parada" as const,
        frenteId: f.id,
        nunca: false,
        diasParado: 100,
        prazoDias: f.prazoDias,
      }
      const t = gerarRascunhoSincrono({
        oportunidade: o,
        clienteNome: "Cliente X",
        frenteNome: f.nome,
        setor: f.setor,
      }).texto
      return t.split("\n\n").at(-1)
    })
    expect(new Set(perguntas).size).toBe(frentes.length)
    for (const q of perguntas) expect(q).not.toMatch(/Vamos conversar/)
  })

  it("formatarDias", () => {
    expect(formatarDias(1)).toBe("1 dia")
    expect(formatarDias(47)).toBe("47 dias")
    expect(formatarDias(365)).toBe("1 ano")
    expect(formatarDias(730)).toBe("2 anos")
  })
})
