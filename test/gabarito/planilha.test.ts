import { describe, expect, it } from "vitest"

import {
  alertasDoCliente,
  proximaOportunidade,
} from "@/lib/domain/opportunities"
import {
  agoraDaConfiguracao,
  avisosDoCliente,
  contextoDoSnapshot,
  montarGrade,
  situacaoDoCliente,
} from "@/lib/domain/rules"
import {
  GABARITO_PLANILHA,
  TOTAL_TAREFAS_PLANILHA,
  montarPlanilha,
} from "@/lib/data/planilha-dataset"

/**
 * TESTE DO GABARITO SOBRE O DATASET REAL DA PLANILHA (10 clientes, 6 frentes,
 * 166 tarefas), com "hoje" = 2026-11-13 (data de referência da planilha).
 */
const snapshot = montarPlanilha()
const ctx = contextoDoSnapshot(snapshot)
const HOJE = agoraDaConfiguracao(snapshot.configuracao, new Date(2030, 0, 1))
const { clients, frentes, acoes } = snapshot

const alertas = (id: string) =>
  alertasDoCliente(id, clients, frentes, acoes, HOJE, ctx)
const ids = (id: string) => alertas(id).map((o) => o.id).sort()

describe("dataset da planilha: integridade", () => {
  it("tem 10 clientes, 6 frentes e 166 tarefas com ids únicos", () => {
    expect(clients).toHaveLength(10)
    expect(frentes).toHaveLength(6)
    expect(frentes.map((f) => f.id)).toEqual([
      "google-ads",
      "meta-ads",
      "crm",
      "comunicacao-site",
      "desenvolvimento",
      "cro",
    ])
    expect(acoes).toHaveLength(TOTAL_TAREFAS_PLANILHA)
    expect(new Set(acoes.map((a) => a.id)).size).toBe(TOTAL_TAREFAS_PLANILHA)
  })

  it("toda tarefa aponta para cliente e frente existentes e contratados", () => {
    const cl = new Set(clients.map((c) => c.id))
    const fr = new Set(frentes.map((f) => f.id))
    const contratos = new Set(
      (snapshot.contratos ?? []).map((c) => `${c.clientId}|${c.frenteId}`)
    )
    for (const a of acoes) {
      expect(cl.has(a.clientId), a.id).toBe(true)
      expect(fr.has(a.frenteId), a.id).toBe(true)
      expect(contratos.has(`${a.clientId}|${a.frenteId}`), a.id).toBe(true)
    }
  })

  it("aguardando aprovação sempre tem aguardandoDesde; concluída tem concluidaEm", () => {
    for (const a of acoes) {
      if (a.status === "aguardando_aprovacao") expect(a.aguardandoDesde, a.id).toBeTruthy()
      if (a.status === "concluida") expect(a.concluidaEm, a.id).toBeTruthy()
      expect(a.criadaEm, a.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("frentes contratadas: lojas em criação só têm Desenvolvimento; CRO é de todo cliente de operação", () => {
    const por = (id: string) =>
      (snapshot.contratos ?? []).filter((c) => c.clientId === id).map((c) => c.frenteId)
    expect(por("raiz-organicos")).toEqual(["desenvolvimento"])
    expect(por("lumi-acessorios")).toEqual(["desenvolvimento"])
    for (const c of clients.filter((x) => x.tipo === "operacao")) {
      expect(por(c.id), c.id).toContain("cro")
      expect(por(c.id), c.id).not.toContain("desenvolvimento")
    }
    // contratos = pares com tarefa + o CRO de quem não tem tarefa de CRO
    const comTarefa = new Set(acoes.map((a) => `${a.clientId}|${a.frenteId}`))
    const cro = clients.filter((c) => c.tipo === "operacao").map((c) => `${c.id}|cro`)
    expect((snapshot.contratos ?? []).length).toBe(
      new Set([...comTarefa, ...cro]).size
    )
  })

  it("Setor 'Comunicação' existe e é o da frente Comunicação do site", () => {
    expect(frentes.find((f) => f.id === "comunicacao-site")).toMatchObject({
      setor: "Comunicação",
      prazoDias: 14,
      criticoAposDias: 28,
    })
  })
})

describe("dataset da planilha: situação por cliente (gabarito)", () => {
  it.each(Object.entries(GABARITO_PLANILHA))("%s", (id, g) => {
    expect(situacaoDoCliente(id, clients, frentes, acoes, HOJE, ctx)).toBe(g.situacao)
  })
})

describe("dataset da planilha: alertas esperados", () => {
  it("Aurora Moda: Google Ads, CRM, CRO (paradas) e Meta Ads (aprovação travada)", () => {
    expect(ids("aurora-moda")).toEqual([
      "aprovacao:aurora-moda:meta-ads",
      "parada:aurora-moda:cro",
      "parada:aurora-moda:crm",
      "parada:aurora-moda:google-ads",
    ].sort())
    const google = alertas("aurora-moda").find((o) => o.frenteId === "google-ads")
    expect(google?.diasParado).toBe(69)
    expect(google?.estado).toBe("critica")
    expect(alertas("aurora-moda").find((o) => o.frenteId === "crm")?.diasParado).toBe(85)
    expect(alertas("aurora-moda").find((o) => o.frenteId === "crm")?.estado).toBe("atrasada")
    expect(alertas("aurora-moda").find((o) => o.frenteId === "meta-ads")?.diasParado).toBe(9)
    expect(proximaOportunidade("aurora-moda", clients, frentes, acoes, HOJE, ctx)?.frenteId).toBeTruthy()
  })

  it("Ninho: CRM há 156 dias e CRO há ~13 meses, ambos críticos", () => {
    expect(ids("ninho-casa-decor")).toEqual([
      "parada:ninho-casa-decor:cro",
      "parada:ninho-casa-decor:crm",
    ].sort())
    expect(alertas("ninho-casa-decor").find((o) => o.frenteId === "crm")?.diasParado).toBe(156)
    for (const o of alertas("ninho-casa-decor")) expect(o.estado).toBe("critica")
  })

  it("Patas: só Google Ads (54 dias, atrasada); aprovação de 4 dias não alerta", () => {
    expect(ids("patas-pet-store")).toEqual(["parada:patas-pet-store:google-ads"])
    const o = alertas("patas-pet-store")[0]
    expect(o.diasParado).toBe(54)
    expect(o.estado).toBe("atrasada")
  })

  it("Vitta: só Comunicação do site (24 dias, prazo 14), mesmo com tarefa em andamento", () => {
    expect(ids("vitta-suplementos")).toEqual([
      "parada:vitta-suplementos:comunicacao-site",
    ])
    expect(alertas("vitta-suplementos")[0].diasParado).toBe(24)
    expect(alertas("vitta-suplementos")[0].estado).toBe("atrasada")
  })

  it("Bella: UM alerta, a aprovação travada de Comunicação do site (6 dias, 3 peças)", () => {
    expect(ids("bella-pele")).toEqual(["aprovacao:bella-pele:comunicacao-site"])
    expect(alertas("bella-pele")[0].diasParado).toBe(6)
    const pecas = acoes.filter(
      (a) =>
        a.clientId === "bella-pele" &&
        a.frenteId === "comunicacao-site" &&
        a.status === "aguardando_aprovacao"
    )
    expect(pecas).toHaveLength(3)
  })

  it("clientes de controle não têm NENHUM alerta", () => {
    for (const id of ["techmania", "doce-lar", "mundo-kids", "lumi-acessorios"]) {
      expect(ids(id), id).toEqual([])
    }
  })

  it("Mundo Kids só tem aviso de perto do prazo (CRO, ~5,5 meses)", () => {
    const avisos = avisosDoCliente("mundo-kids", clients, frentes, acoes, HOJE, ctx)
    expect(avisos.map((a) => a.frenteId)).toEqual(["cro"])
    expect(avisos[0].dias).toBe(169)
  })

  it("Raiz: loja em criação, 66 dias sem retorno, faltam 24 dias para o bloqueio", () => {
    expect(ids("raiz-organicos")).toEqual(["parada:raiz-organicos:desenvolvimento"])
    const o = alertas("raiz-organicos")[0]
    expect(o.estado).toBe("critica")
    expect(o.diasParado).toBe(66)
    expect(o.diasParaBloqueio).toBe(24)
  })
})

describe("dataset da planilha: CRO sem histórico (informativo)", () => {
  const grade = montarGrade(clients, frentes, acoes, HOJE, ctx)
  const croDe = (id: string) =>
    grade.find((g) => g.clientId === id && g.frenteId === "cro")

  it.each(["patas-pet-store", "vitta-suplementos", "bella-pele"])(
    "%s: CRO sem nenhuma ação concluída = sem histórico, não 'nunca'",
    (id) => {
      expect(acoes.some((a) => a.clientId === id && a.frenteId === "cro")).toBe(false)
      expect(croDe(id)).toMatchObject({
        semHistorico: true,
        nunca: false,
        estado: "em_dia",
        dias: null,
        travada: false,
      })
      expect(alertas(id).some((o) => o.frenteId === "cro")).toBe(false)
    }
  )

  it("quem tem registro de CRO não é 'sem histórico'", () => {
    for (const id of ["aurora-moda", "ninho-casa-decor", "techmania", "doce-lar", "mundo-kids"]) {
      expect(croDe(id)?.semHistorico, id).toBe(false)
    }
    expect(grade.filter((g) => g.semHistorico).map((g) => g.clientId).sort()).toEqual([
      "bella-pele",
      "patas-pet-store",
      "vitta-suplementos",
    ])
  })

  it("Aurora e Ninho: CRO com histórico antigo continua crítico (19 e 13 meses)", () => {
    expect(croDe("aurora-moda")).toMatchObject({ estado: "critica", dias: 582 })
    expect(croDe("ninho-casa-decor")).toMatchObject({ estado: "critica", dias: 389 })
  })

  it("o total de alertas do dataset é 10 (Aurora 4, Ninho 2, Patas, Vitta, Bella, Raiz 1)", () => {
    expect(clients.flatMap((c) => alertas(c.id))).toHaveLength(10)
  })
})
