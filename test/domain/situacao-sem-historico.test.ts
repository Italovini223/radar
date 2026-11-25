import { describe, expect, it } from "vitest"

import { montarPlanilha } from "@/lib/data/planilha-dataset"
import { gerarRascunhoSincrono } from "@/lib/ai/proposal"
import { alertasPorFrente } from "@/lib/domain/carteira"
import { setoresDasFrentes } from "@/lib/domain/frentes"
import { derivarOportunidades } from "@/lib/domain/opportunities"
import { tituloSugerido } from "@/lib/domain/rotulos"
import {
  FRENTES_SEM_HISTORICO_INFORMATIVO,
  avaliarFrente,
  contarAlertas,
  montarGrade,
  situacaoDaGrade,
} from "@/lib/domain/rules"
import {
  SETORES,
  type Acao,
  type Client,
  type Frente,
  type StatusFrente,
} from "@/lib/domain/types"

const NOW = new Date(2026, 10, 13, 12)

const st = (
  frenteId: string,
  estado: StatusFrente["estado"],
  extra: Partial<StatusFrente> = {}
): StatusFrente => ({
  clientId: "c",
  frenteId,
  estado,
  nunca: false,
  semHistorico: false,
  dias: 10,
  prazoDias: 30,
  travada: false,
  relogio: "ultima_acao",
  diasParaBloqueio: null,
  ...extra,
})

describe("situação do cliente pela contagem de alertas", () => {
  it("0 alertas = ok (perto do prazo e sem histórico não contam)", () => {
    expect(situacaoDaGrade([])).toBe("ok")
    expect(
      situacaoDaGrade([
        st("a", "em_dia"),
        st("b", "atencao"),
        st("cro", "em_dia", { semHistorico: true, dias: null }),
      ])
    ).toBe("ok")
  })

  it("1 alerta = atenção (uma atrasada OU uma aprovação travada)", () => {
    expect(situacaoDaGrade([st("a", "atrasada"), st("b", "em_dia")])).toBe("atencao")
    expect(situacaoDaGrade([st("a", "em_dia", { travada: true })])).toBe("atencao")
  })

  it("2+ alertas sem nenhuma crítica = crítico", () => {
    expect(situacaoDaGrade([st("a", "atrasada"), st("b", "atrasada")])).toBe("critico")
    expect(
      situacaoDaGrade([st("a", "atrasada"), st("b", "em_dia", { travada: true })])
    ).toBe("critico")
    // O mesmo par atrasado E travado são dois alertas (duas oportunidades).
    expect(situacaoDaGrade([st("a", "atrasada", { travada: true })])).toBe("critico")
  })

  it("qualquer frente crítica = crítico, mesmo sendo o único alerta", () => {
    expect(situacaoDaGrade([st("a", "critica")])).toBe("critico")
    expect(situacaoDaGrade([st("a", "critica", { nunca: true, dias: null })])).toBe("critico")
  })

  it("contarAlertas conta os mesmos itens das oportunidades", () => {
    const s = montarPlanilha()
    const ctx = { contratos: s.contratos, limiteAprovacaoDias: 5, bloqueioContratualDias: 90 }
    const grade = montarGrade(s.clients, s.frentes, s.acoes, NOW, ctx)
    const opps = derivarOportunidades(s.clients, s.frentes, s.acoes, NOW, ctx)
    for (const c of s.clients) {
      expect(
        contarAlertas(grade.filter((g) => g.clientId === c.id)),
        c.id
      ).toBe(opps.filter((o) => o.clientId === c.id).length)
    }
  })
})

describe("frentes informativas sem histórico (CRO)", () => {
  const cro: Frente = { id: "cro", nome: "CRO", setor: "CRO & UX", prazoDias: 180, criticoAposDias: 360 }
  const google: Frente = { id: "google-ads", nome: "Google Ads", setor: "Mídia paga", prazoDias: 30, criticoAposDias: 60 }
  const acao = (frenteId: string, extra: Partial<Acao>): Acao => ({
    id: `a-${frenteId}-${Math.random()}`,
    clientId: "c",
    frenteId,
    titulo: "x",
    data: "2026-11-01",
    status: "concluida",
    ...extra,
  })

  it("o conjunto documentado hoje só tem o CRO", () => {
    expect([...FRENTES_SEM_HISTORICO_INFORMATIVO]).toEqual(["cro"])
  })

  it("CRO sem nenhuma ação: sem histórico, em dia, sem 'nunca' e sem alerta", () => {
    expect(avaliarFrente([], "c", cro, NOW)).toMatchObject({
      semHistorico: true,
      nunca: false,
      estado: "em_dia",
      dias: null,
      travada: false,
    })
  })

  it("outras frentes sem ação continuam 'nunca teve ação' (crítica)", () => {
    expect(avaliarFrente([], "c", google, NOW)).toMatchObject({
      semHistorico: false,
      nunca: true,
      estado: "critica",
    })
  })

  it("só ação em andamento não é histórico: continua sem histórico", () => {
    const r = avaliarFrente([acao("cro", { status: "em_andamento" })], "c", cro, NOW)
    expect(r.semHistorico).toBe(true)
  })

  it("com uma ação concluída deixa de ser sem histórico e vale o prazo normal", () => {
    const velho = avaliarFrente([acao("cro", { data: "2025-01-10" })], "c", cro, NOW)
    expect(velho).toMatchObject({ semHistorico: false, estado: "critica" })
    const recente = avaliarFrente([acao("cro", { data: "2026-10-01" })], "c", cro, NOW)
    expect(recente).toMatchObject({ semHistorico: false, estado: "em_dia" })
  })

  it("aprovação travada em CRO sem histórico ainda é alerta (1 alerta = atenção)", () => {
    const a = acao("cro", {
      status: "aguardando_aprovacao",
      data: "2026-11-01",
      aguardandoDesde: "2026-11-01",
    })
    const r = avaliarFrente([a], "c", cro, NOW)
    expect(r).toMatchObject({ semHistorico: true, travada: true })
    expect(situacaoDaGrade([r])).toBe("atencao")
  })

  it("não gera oportunidade, fica fora de Problemas e o cliente continua ok", () => {
    const clientes: Client[] = [
      { id: "c", nome: "Cliente", nicho: "x", tipo: "operacao", responsavel: "", ativo: true },
    ]
    const frentes = [google, cro]
    const acoes = [acao("google-ads", { data: "2026-11-10" })]
    const grade = montarGrade(clientes, frentes, acoes, NOW)
    expect(derivarOportunidades(clientes, frentes, acoes, NOW)).toEqual([])
    expect(alertasPorFrente(grade, frentes).map((a) => a.total)).toEqual([0, 0])
    expect(situacaoDaGrade(grade)).toBe("ok")
  })

  it("paridade com dados novos: gráfico = pares atrasados/críticos da Grade, sem 'sem histórico'", () => {
    const s = montarPlanilha()
    const ctx = { contratos: s.contratos, limiteAprovacaoDias: 5, bloqueioContratualDias: 90 }
    const grade = montarGrade(s.clients, s.frentes, s.acoes, NOW, ctx)
    const r = alertasPorFrente(grade, s.frentes)
    expect(r).toHaveLength(6)
    expect(Object.fromEntries(r.map((x) => [x.frente.id, x.total]))).toEqual({
      "google-ads": 2,
      "meta-ads": 0,
      crm: 2,
      "comunicacao-site": 1,
      desenvolvimento: 1,
      cro: 2,
    })
    expect(r.reduce((t, x) => t + x.total, 0)).toBe(
      grade.filter((g) => g.estado === "atrasada" || g.estado === "critica").length
    )
    expect(grade.filter((g) => g.semHistorico && g.estado !== "em_dia")).toEqual([])
  })

  it("Raiz e Lumi só têm Desenvolvimento: as outras 5 frentes não geram par ('—' na Grade)", () => {
    const s = montarPlanilha()
    const ctx = { contratos: s.contratos }
    const grade = montarGrade(s.clients, s.frentes, s.acoes, NOW, ctx)
    for (const id of ["raiz-organicos", "lumi-acessorios"]) {
      expect(
        grade.filter((g) => g.clientId === id).map((g) => g.frenteId),
        id
      ).toEqual(["desenvolvimento"])
    }
    expect(grade).toHaveLength(8 * 5 + 2)
  })
})

describe("frente e setor Comunicação", () => {
  it("'Comunicação' está em SETORES e os setores antigos continuam (fixture de 8 frentes)", () => {
    expect(SETORES).toContain("Comunicação")
    for (const s of ["Conteúdo", "Materiais", "Redação"]) expect(SETORES).toContain(s)
  })

  it("o filtro de setor só lista setores que têm frente", () => {
    const planilha = montarPlanilha()
    expect(setoresDasFrentes(planilha.frentes)).toEqual([
      "Mídia paga",
      "CRM & Automação",
      "CRO & UX",
      "Comunicação",
      "Desenvolvimento",
    ])
  })

  it("título sugerido e proposta próprios da Comunicação do site", () => {
    expect(
      tituloSugerido({ id: "comunicacao-site", nome: "Comunicação do site" })
    ).toBe("Atualização da comunicação do site feita hoje")
    const p = gerarRascunhoSincrono({
      oportunidade: {
        id: "parada:v:comunicacao-site",
        tipo: "parada",
        clientId: "v",
        frenteId: "comunicacao-site",
        severidade: "media",
        estado: "atrasada",
        nunca: false,
        motivo: "m",
        diasParado: 24,
        prazoDias: 14,
        diasParaBloqueio: null,
        setorResponsavel: "Comunicação",
        nova: true,
      },
      clienteNome: "Vitta Suplementos",
      frenteNome: "Comunicação do site",
      setor: "Comunicação",
    })
    expect(p.setorSugerido).toBe("Comunicação")
    expect(p.texto).toContain("Vitta Suplementos")
    expect(p.texto).toContain("banners")
    expect(p.texto).toContain("14 dias")
    expect(p.texto).not.toContain("Sem acompanhamento")
  })
})
