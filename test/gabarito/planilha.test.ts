import { describe, expect, it } from "vitest"

import {
  alertasDoCliente,
  proximaOportunidade,
} from "@/lib/domain/opportunities"
import {
  agoraDaConfiguracao,
  avisosDoCliente,
  contextoDoSnapshot,
  situacaoDoCliente,
} from "@/lib/domain/rules"
import {
  GABARITO_PLANILHA,
  TOTAL_TAREFAS_PLANILHA,
  montarPlanilha,
} from "@/lib/data/planilha-dataset"

/**
 * TESTE DO GABARITO SOBRE O DATASET REAL DA PLANILHA (10 clientes, 8 frentes,
 * 172 tarefas), com "hoje" = 2026-11-13 (data de referência da planilha).
 */
const snapshot = montarPlanilha()
const ctx = contextoDoSnapshot(snapshot)
const HOJE = agoraDaConfiguracao(snapshot.configuracao, new Date(2030, 0, 1))
const { clients, frentes, acoes } = snapshot

const alertas = (id: string) =>
  alertasDoCliente(id, clients, frentes, acoes, HOJE, ctx)
const ids = (id: string) => alertas(id).map((o) => o.id).sort()

describe("dataset da planilha: integridade", () => {
  it("tem 10 clientes, 8 frentes e 172 tarefas com ids únicos", () => {
    expect(clients).toHaveLength(10)
    expect(frentes).toHaveLength(8)
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

  it("frentes contratadas: lojas em criação só têm Desenvolvimento; CRO não é de todos", () => {
    const por = (id: string) =>
      (snapshot.contratos ?? []).filter((c) => c.clientId === id).map((c) => c.frenteId)
    expect(por("raiz-organicos")).toEqual(["desenvolvimento"])
    expect(por("lumi-acessorios")).toEqual(["desenvolvimento"])
    expect(por("patas-pet-store")).not.toContain("cro")
    expect(por("vitta-suplementos")).not.toContain("cro")
    expect(por("bella-pele")).not.toContain("cro")
    expect(por("aurora-moda")).toContain("cro")
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

  it("Vitta: só Social / Conteúdo (24 dias, prazo 14)", () => {
    expect(ids("vitta-suplementos")).toEqual(["parada:vitta-suplementos:conteudo"])
    expect(alertas("vitta-suplementos")[0].diasParado).toBe(24)
  })

  it("Bella: só a aprovação travada de Materiais (6 dias)", () => {
    expect(ids("bella-pele")).toEqual(["aprovacao:bella-pele:materiais"])
    expect(alertas("bella-pele")[0].diasParado).toBe(6)
  })

  it("clientes de controle não têm NENHUM alerta", () => {
    for (const id of ["techmania", "doce-lar", "mundo-kids", "lumi-acessorios"]) {
      expect(ids(id), id).toEqual([])
    }
  })

  it("Mundo Kids só tem avisos de perto do prazo (Redação e CRO)", () => {
    const avisos = avisosDoCliente("mundo-kids", clients, frentes, acoes, HOJE, ctx)
    expect(avisos.map((a) => a.frenteId).sort()).toEqual(["cro", "redacao"])
  })

  it("Raiz: loja em criação, 66 dias sem retorno, faltam 24 dias para o bloqueio", () => {
    expect(ids("raiz-organicos")).toEqual(["parada:raiz-organicos:desenvolvimento"])
    const o = alertas("raiz-organicos")[0]
    expect(o.estado).toBe("critica")
    expect(o.diasParado).toBe(66)
    expect(o.diasParaBloqueio).toBe(24)
  })
})
