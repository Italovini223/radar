import { addDays } from "date-fns"
import { describe, expect, it } from "vitest"

import { gerarRascunhoSincrono, AVISO_RASCUNHO } from "./ai/proposal"
import { aplicarCheckup } from "./domain/checkup"
import {
  calcularMetricas,
  derivarOportunidades,
  formatarDias,
} from "./domain/opportunities"
import {
  DIAS_APROVACAO_TRAVADA,
  acoesTravadas,
  avaliarFrente,
  classificarDias,
  montarGrade,
  toISODate,
  ultimaAcaoConcluida,
} from "./domain/rules"
import type { Acao, Frente } from "./domain/types"
import { buildSeed } from "./data/seed"

/** "Hoje" fixo: 16/11/2026 (meio-dia local, para evitar bordas de fuso). */
const NOW = new Date(2026, 10, 16, 12, 0, 0)
const atras = (dias: number) => toISODate(addDays(NOW, -dias))

const frente = (prazoDias: number): Frente => ({
  id: "f",
  nome: "Frente",
  setor: "Mídia paga",
  prazoDias,
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

describe("classificarDias: limites de 75% / 100% / 150%", () => {
  // prazo 100 deixa os limites em números redondos
  it.each([
    [0, "em_dia"],
    [74, "em_dia"],
    [75, "atencao"], // exatamente 75% já é atenção
    [100, "atencao"], // exatamente 100% ainda é atenção
    [101, "atrasada"],
    [150, "atrasada"], // exatamente 150% ainda é atrasada
    [151, "critica"],
  ] as const)("prazo 100, %i dias => %s", (dias, esperado) => {
    expect(classificarDias(dias, 100)).toEqual({
      estado: esperado,
      nunca: false,
    })
  })

  it("prazo 30: 22 em dia, 23 atenção, 30 atenção, 31 atrasada, 45 atrasada, 46 crítica", () => {
    expect(classificarDias(22, 30).estado).toBe("em_dia")
    expect(classificarDias(23, 30).estado).toBe("atencao")
    expect(classificarDias(30, 30).estado).toBe("atencao")
    expect(classificarDias(31, 30).estado).toBe("atrasada")
    expect(classificarDias(45, 30).estado).toBe("atrasada")
    expect(classificarDias(46, 30).estado).toBe("critica")
  })

  it("nunca teve ação => crítica, marcada como nunca", () => {
    expect(classificarDias(null, 30)).toEqual({ estado: "critica", nunca: true })
    expect(classificarDias(null, 365)).toEqual({ estado: "critica", nunca: true })
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
    expect(s.estado).toBe("critica")
    expect(s.nunca).toBe(false)
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

describe("aprovação travada (> 7 dias)", () => {
  const aguardando = (dias: number) =>
    acao(dias, {
      status: "aguardando_aprovacao",
      aguardandoDesde: atras(dias),
    })

  it("limite: 7 dias não alerta, 8 dias alerta", () => {
    expect(DIAS_APROVACAO_TRAVADA).toBe(7)
    expect(acoesTravadas([aguardando(7)], NOW)).toHaveLength(0)
    expect(acoesTravadas([aguardando(8)], NOW)).toHaveLength(1)
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

describe("seed + oráculo dos gargalos plantados", () => {
  const seed = buildSeed(NOW)
  const grade = montarGrade(seed.clients, seed.frentes, seed.acoes, NOW)
  const celula = (clientId: string, frenteId: string) => {
    const s = grade.find((g) => g.clientId === clientId && g.frenteId === frenteId)
    if (!s) throw new Error(`célula ausente: ${clientId}/${frenteId}`)
    return s
  }

  it("5 clientes x 8 frentes", () => {
    expect(seed.clients).toHaveLength(5)
    expect(seed.frentes).toHaveLength(8)
    expect(grade).toHaveLength(40)
  })

  it("prazos iniciais por frente", () => {
    const prazo = Object.fromEntries(seed.frentes.map((f) => [f.id, f.prazoDias]))
    expect(prazo).toEqual({
      "google-ads": 30,
      "meta-ads": 30,
      crm: 15,
      cro: 180,
      layout: 365,
      conteudo: 30,
      materiais: 30,
      redacao: 30,
    })
  })

  it("Flor de Sal: Google Ads parado (40 dias, prazo 30) => atrasada", () => {
    expect(celula("flor-de-sal", "google-ads")).toMatchObject({
      estado: "atrasada",
      dias: 40,
      nunca: false,
    })
  })

  it("Casa Nativa: Layout há ~2 anos => crítica", () => {
    const s = celula("casa-nativa", "layout")
    expect(s.estado).toBe("critica")
    expect(s.dias).toBe(730)
  })

  it("Velô Bikes: CRM sem nenhuma ação => crítica (nunca)", () => {
    expect(celula("velo-bikes", "crm")).toMatchObject({
      estado: "critica",
      nunca: true,
      dias: null,
    })
  })

  it("Nossa Horta: Conteúdo há 90 dias => crítica (> 150% de 30)", () => {
    expect(celula("nossa-horta", "conteudo")).toMatchObject({
      estado: "critica",
      dias: 90,
    })
  })

  it("5º cliente: tudo em dia por prazo; só a aprovação está travada", () => {
    const aurora = grade.filter((g) => g.clientId === "aurora-pet")
    expect(aurora.every((g) => g.estado === "em_dia" || g.estado === "atencao")).toBe(true)
    expect(aurora.filter((g) => g.travada).map((g) => g.frenteId)).toEqual(["redacao"])
  })

  it("o Radar lista EXATAMENTE as 5 oportunidades esperadas", () => {
    const opps = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    expect(opps.map((o) => o.id).sort()).toEqual(
      [
        "aprovacao:aurora-pet:redacao",
        "parada:casa-nativa:layout",
        "parada:flor-de-sal:google-ads",
        "parada:nossa-horta:conteudo",
        "parada:velo-bikes:crm",
      ].sort()
    )
  })

  it("severidade: crítica = alta; atrasada e aprovação travada = média", () => {
    const opps = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    const por = Object.fromEntries(opps.map((o) => [o.id, o]))
    expect(por["parada:velo-bikes:crm"].severidade).toBe("alta")
    expect(por["parada:nossa-horta:conteudo"].severidade).toBe("alta")
    expect(por["parada:casa-nativa:layout"].severidade).toBe("alta")
    expect(por["parada:flor-de-sal:google-ads"].severidade).toBe("media")
    expect(por["aprovacao:aurora-pet:redacao"].severidade).toBe("media")
  })

  it("ordenação: altas primeiro, 'nunca' é o pior caso, paradas antes de aprovações", () => {
    const opps = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    expect(opps.map((o) => o.id)).toEqual([
      "parada:velo-bikes:crm",
      "parada:nossa-horta:conteudo",
      "parada:casa-nativa:layout",
      "parada:flor-de-sal:google-ads",
      "aprovacao:aurora-pet:redacao",
    ])
  })

  it("setor responsável vem da frente", () => {
    const opps = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    const setor = (id: string) => opps.find((o) => o.id === id)?.setorResponsavel
    expect(setor("parada:velo-bikes:crm")).toBe("CRM & Automação")
    expect(setor("parada:casa-nativa:layout")).toBe("CRO & UX")
    expect(setor("parada:flor-de-sal:google-ads")).toBe("Mídia paga")
  })

  it("'nova' = venceu o prazo há até 14 dias", () => {
    const opps = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    const nova = (id: string) => opps.find((o) => o.id === id)?.nova
    expect(nova("parada:flor-de-sal:google-ads")).toBe(true) // 40 - 30 = 10
    expect(nova("parada:nossa-horta:conteudo")).toBe(false) // 90 - 30 = 60
    expect(nova("parada:velo-bikes:crm")).toBe(false)
  })

  it("métricas calculadas", () => {
    const m = calcularMetricas(seed.clients, seed.frentes, seed.acoes, NOW)
    expect(m).toMatchObject({
      clientesAtivos: 5,
      oportunidades: 5,
      clientesComOportunidade: 5,
      prioritarias: 3,
      frentesCriticas: 3,
      aguardandoAprovacao: 2, // Aurora (10 dias) + Flor (3 dias)
      aprovacaoTravada: 1,
    })
  })

  it("cliente inativo some da grade e das oportunidades", () => {
    const clients = seed.clients.map((c) =>
      c.id === "velo-bikes" ? { ...c, ativo: false } : c
    )
    const opps = derivarOportunidades(clients, seed.frentes, seed.acoes, NOW)
    expect(opps.some((o) => o.clientId === "velo-bikes")).toBe(false)
    expect(montarGrade(clients, seed.frentes, seed.acoes, NOW)).toHaveLength(32)
  })

  it("registrar uma ação resolve a oportunidade (par volta a em dia)", () => {
    const acoes = [
      ...seed.acoes,
      {
        id: "nova",
        clientId: "flor-de-sal",
        frenteId: "google-ads",
        titulo: "Campanha retomada",
        data: atras(0),
        status: "concluida" as const,
      },
    ]
    const opps = derivarOportunidades(seed.clients, seed.frentes, acoes, NOW)
    expect(opps.some((o) => o.id === "parada:flor-de-sal:google-ads")).toBe(false)
    expect(opps).toHaveLength(4)
  })

  it("mudar o prazo de Google Ads para 60 dias tira Flor de Sal do Radar", () => {
    const frentes = seed.frentes.map((f) =>
      f.id === "google-ads" ? { ...f, prazoDias: 60 } : f
    )
    const opps = derivarOportunidades(seed.clients, frentes, seed.acoes, NOW)
    expect(opps.some((o) => o.id === "parada:flor-de-sal:google-ads")).toBe(false)
  })

  it("é determinístico para o mesmo 'hoje' e muda com outro 'hoje'", () => {
    const a = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    const b = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)
    expect(a).toEqual(b)
    const depois = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, addDays(NOW, 60))
    expect(depois.length).toBeGreaterThan(a.length)
  })
})

describe("aplicarCheckup", () => {
  const seed = buildSeed(NOW)

  it("data mais recente: nova ação concluída e par sai do Radar", () => {
    const r = aplicarCheckup(seed.acoes, seed.frentes, "flor-de-sal", [
      { frenteId: "google-ads", data: atras(1) },
    ])
    expect(r.alteradas).toEqual(["google-ads"])
    const s = avaliarFrente(r.acoes, "flor-de-sal", seed.frentes[0], NOW)
    expect(s.dias).toBe(1)
    expect(s.estado).toBe("em_dia")
  })

  it("data igual à atual ou vazia: nada muda", () => {
    const r = aplicarCheckup(seed.acoes, seed.frentes, "flor-de-sal", [
      { frenteId: "google-ads", data: atras(40) },
      { frenteId: "crm", data: "" },
    ])
    expect(r.alteradas).toEqual([])
    expect(r.acoes).toHaveLength(seed.acoes.length)
  })

  it("data mais antiga: corrige o histórico e piora o estado", () => {
    const r = aplicarCheckup(seed.acoes, seed.frentes, "aurora-pet", [
      { frenteId: "google-ads", data: atras(100) },
    ])
    const s = avaliarFrente(r.acoes, "aurora-pet", seed.frentes[0], NOW)
    expect(s.dias).toBe(100)
    expect(s.estado).toBe("critica")
  })

  it("frente sem ação (Velô/CRM): informar uma data tira de 'nunca'", () => {
    const crm = seed.frentes.find((f) => f.id === "crm")!
    const r = aplicarCheckup(seed.acoes, seed.frentes, "velo-bikes", [
      { frenteId: "crm", data: atras(5) },
    ])
    const s = avaliarFrente(r.acoes, "velo-bikes", crm, NOW)
    expect(s).toMatchObject({ nunca: false, dias: 5, estado: "em_dia" })
  })
})

describe("gerador simulado de rascunho", () => {
  const seed = buildSeed(NOW)
  const opps = derivarOportunidades(seed.clients, seed.frentes, seed.acoes, NOW)

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
        expect(p.texto).toContain("7 dias")
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
