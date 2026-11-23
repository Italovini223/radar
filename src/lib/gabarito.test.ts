import { describe, expect, it } from "vitest"

import { buildSeed } from "./data/seed"
import {
  alertasDoCliente,
  proximaOportunidade,
} from "./domain/opportunities"
import {
  agoraDaConfiguracao,
  avisosDoCliente,
  contextoDoSnapshot,
  montarGrade,
  situacaoDoCliente,
  situacoesDaCarteira,
} from "./domain/rules"
import type { SituacaoCliente } from "./domain/types"

/**
 * TESTE DO GABARITO (Sprint 2): "hoje" = 2026-11-13 (data de referência da
 * configuração) sobre a fixture sintética que reproduz os fatos da planilha.
 * Quando o dataset real da planilha for importado, este teste deve passar
 * também com ele (mesmas situações e alertas).
 */
const snapshot = buildSeed()
const ctx = contextoDoSnapshot(snapshot)
const HOJE = agoraDaConfiguracao(snapshot.configuracao, new Date(2030, 0, 1))
const { clients, frentes, acoes } = snapshot

const alertas = (id: string) =>
  alertasDoCliente(id, clients, frentes, acoes, HOJE, ctx).map((o) => o.id)

describe("gabarito: data de referência e configuração", () => {
  it("'hoje' vem da configuração (2026-11-13), não do relógio", () => {
    expect(HOJE.getFullYear()).toBe(2026)
    expect(HOJE.getMonth()).toBe(10)
    expect(HOJE.getDate()).toBe(13)
    expect(snapshot.configuracao).toEqual({
      limiteAprovacaoDias: 5,
      bloqueioContratualDias: 90,
      dataReferencia: "2026-11-13",
      usarHojeReal: false,
    })
  })
})

describe("gabarito: situação por cliente", () => {
  const esperado: Record<string, SituacaoCliente> = {
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
  }

  it.each(Object.entries(esperado))("%s => %s", (id, situacao) => {
    expect(situacaoDoCliente(id, clients, frentes, acoes, HOJE, ctx)).toBe(situacao)
  })

  it("a visão da carteira bate com a de cada cliente", () => {
    const todos = situacoesDaCarteira(clients, frentes, acoes, HOJE, ctx)
    expect(Object.fromEntries(todos)).toEqual(esperado)
  })
})

describe("gabarito: alertas esperados por cliente", () => {
  it("Aurora Moda: Google Ads crítica, CRM atrasada, Meta Ads com 2 itens travados", () => {
    expect(alertas("aurora-moda")).toEqual([
      "parada:aurora-moda:google-ads",
      "parada:aurora-moda:crm",
      "aprovacao:aurora-moda:meta-ads",
    ])
    const meta = alertasDoCliente("aurora-moda", clients, frentes, acoes, HOJE, ctx).find(
      (o) => o.tipo === "aprovacao"
    )
    expect(meta?.diasParado).toBe(9)
    const aguardando = acoes.filter(
      (a) =>
        a.clientId === "aurora-moda" &&
        a.frenteId === "meta-ads" &&
        a.status === "aguardando_aprovacao"
    )
    expect(aguardando).toHaveLength(2)
  })

  it("Ninho: CRM (156 d) e CRO (~13 meses) críticas", () => {
    expect(alertas("ninho-casa-decor").sort()).toEqual([
      "parada:ninho-casa-decor:crm",
      "parada:ninho-casa-decor:cro",
    ])
  })

  it("Patas: só Google Ads (54 d, atrasada); 1 item aguardando há 4 d NÃO alerta", () => {
    expect(alertas("patas-pet-store")).toEqual(["parada:patas-pet-store:google-ads"])
    expect(
      acoes.filter(
        (a) => a.clientId === "patas-pet-store" && a.status === "aguardando_aprovacao"
      )
    ).toHaveLength(1)
  })

  it("Vitta: só Social/Conteúdo (24 d, prazo 14)", () => {
    expect(alertas("vitta-suplementos")).toEqual(["parada:vitta-suplementos:conteudo"])
  })

  it("Bella Pele: aprovação travada das 3 peças de Materiais (6 d)", () => {
    expect(alertas("bella-pele")).toEqual(["aprovacao:bella-pele:materiais"])
    const o = alertasDoCliente("bella-pele", clients, frentes, acoes, HOJE, ctx)[0]
    expect(o.diasParado).toBe(6)
    expect(
      acoes.filter(
        (a) => a.clientId === "bella-pele" && a.status === "aguardando_aprovacao"
      )
    ).toHaveLength(3)
  })

  it("Raiz Orgânicos: Desenvolvimento crítica, 66 d sem retorno, faltam 24 dias para o bloqueio", () => {
    const lista = alertasDoCliente("raiz-organicos", clients, frentes, acoes, HOJE, ctx)
    expect(lista.map((o) => o.id)).toEqual(["parada:raiz-organicos:desenvolvimento"])
    expect(lista[0]).toMatchObject({
      estado: "critica",
      severidade: "alta",
      diasParado: 66,
      diasParaBloqueio: 24,
    })
    expect(lista[0].motivo).toContain("faltam 24 dias para o bloqueio contratual")
    const follow = acoes.filter(
      (a) =>
        a.clientId === "raiz-organicos" &&
        a.status === "concluida" &&
        a.titulo.startsWith("Follow-up")
    )
    expect(follow).toHaveLength(2)
  })

  it("Raiz e Lumi só têm a frente Desenvolvimento", () => {
    const grade = montarGrade(clients, frentes, acoes, HOJE, ctx)
    for (const id of ["raiz-organicos", "lumi-acessorios"]) {
      expect(
        grade.filter((g) => g.clientId === id).map((g) => g.frenteId)
      ).toEqual(["desenvolvimento"])
    }
  })
})

describe("gabarito: clientes Ok não têm alertas indevidos", () => {
  it.each(["techmania", "doce-lar", "mundo-kids", "lumi-acessorios"])(
    "%s: nenhum alerta",
    (id) => {
      expect(alertas(id)).toEqual([])
      expect(proximaOportunidade(id, clients, frentes, acoes, HOJE, ctx)).toBeNull()
    }
  )

  it("Mundo Kids: só avisos 'perto do prazo' (Redação 27/30 e CRO ~165/180)", () => {
    const avisos = avisosDoCliente("mundo-kids", clients, frentes, acoes, HOJE, ctx)
    expect(
      avisos.map((a) => [a.frenteId, a.dias, a.estado]).sort()
    ).toEqual([
      ["cro", 165, "atencao"],
      ["redacao", 27, "atencao"],
    ])
  })

  it("Lumi: item aguardando há 1 d, tudo ok", () => {
    const grade = montarGrade(clients, frentes, acoes, HOJE, ctx).filter(
      (g) => g.clientId === "lumi-acessorios"
    )
    expect(grade).toHaveLength(1)
    expect(grade[0]).toMatchObject({ estado: "em_dia", dias: 1, diasParaBloqueio: 89 })
  })

  it("TechMania e Doce Lar: todas as frentes dentro do prazo (em dia)", () => {
    const grade = montarGrade(clients, frentes, acoes, HOJE, ctx).filter((g) =>
      ["techmania", "doce-lar"].includes(g.clientId)
    )
    expect(grade.length).toBeGreaterThan(0)
    expect(grade.every((g) => g.estado === "em_dia" && !g.travada)).toBe(true)
  })

  it("nenhum cliente Ok tem alerta; nenhum alerta cai em cliente que não esperava", () => {
    const todos = clients.flatMap((c) => alertas(c.id))
    const donos = new Set(todos.map((id) => id.split(":")[1]))
    expect([...donos].sort()).toEqual([
      "aurora-moda",
      "bella-pele",
      "ninho-casa-decor",
      "patas-pet-store",
      "raiz-organicos",
      "vitta-suplementos",
    ])
  })
})

describe("gabarito: próxima oportunidade", () => {
  it("Aurora Moda: Google Ads crítica (a de maior severidade)", () => {
    const o = proximaOportunidade("aurora-moda", clients, frentes, acoes, HOJE, ctx)
    expect(o).toMatchObject({
      id: "parada:aurora-moda:google-ads",
      estado: "critica",
      diasParado: 69,
    })
  })

  it("crítica > atrasada > aprovação travada; empate pelo maior número de dias parado", () => {
    // Ninho: CRM 156 d x CRO 389 d, ambas críticas => a mais dias (CRO).
    expect(
      proximaOportunidade("ninho-casa-decor", clients, frentes, acoes, HOJE, ctx)?.id
    ).toBe("parada:ninho-casa-decor:cro")
    // Bella: só aprovação.
    expect(
      proximaOportunidade("bella-pele", clients, frentes, acoes, HOJE, ctx)?.tipo
    ).toBe("aprovacao")
    // Aurora sem o Google Ads crítico: atrasada (CRM) vence a aprovação (Meta).
    const semGoogle = acoes.filter(
      (a) => !(a.clientId === "aurora-moda" && a.frenteId === "google-ads")
    ).concat({
      id: "x",
      clientId: "aurora-moda",
      frenteId: "google-ads",
      titulo: "ok",
      data: "2026-11-13",
      status: "concluida",
    })
    expect(
      proximaOportunidade("aurora-moda", clients, frentes, semGoogle, HOJE, ctx)?.id
    ).toBe("parada:aurora-moda:crm")
  })
})
