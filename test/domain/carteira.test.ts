import { describe, expect, it } from "vitest"

import { montarPlanilha } from "@/lib/data/planilha-dataset"
import {
  agruparPorCliente,
  alertasPorCliente,
  alertasPorFrente,
  resumoCarteira,
} from "@/lib/domain/carteira"
import { derivarOportunidades } from "@/lib/domain/opportunities"
import {
  agoraDaConfiguracao,
  contextoDoSnapshot,
  montarGrade,
  situacoesDaCarteira,
} from "@/lib/domain/rules"
import type {
  Client,
  Frente,
  Opportunity,
  SituacaoCliente,
  StatusFrente,
} from "@/lib/domain/types"

const snapshot = montarPlanilha()
const ctx = contextoDoSnapshot(snapshot)
const HOJE = agoraDaConfiguracao(snapshot.configuracao, new Date(2030, 0, 1))
const { clients, frentes, acoes } = snapshot
const grade = montarGrade(clients, frentes, acoes, HOJE, ctx)
const oportunidades = derivarOportunidades(clients, frentes, acoes, HOJE, ctx)
const situacoes = situacoesDaCarteira(clients, frentes, acoes, HOJE, ctx)

describe("resumoCarteira", () => {
  it("conta clientes por situação; precisam de ação = crítico + atenção", () => {
    expect(
      resumoCarteira(["critico", "critico", "atencao", "ok", "ok", "ok"])
    ).toEqual({ total: 6, precisamAcao: 3, criticos: 2, atencao: 1, ok: 3 })
  })

  it("carteira vazia: tudo zero", () => {
    expect(resumoCarteira([])).toEqual({
      total: 0,
      precisamAcao: 0,
      criticos: 0,
      atencao: 0,
      ok: 0,
    })
  })

  it("sem ninguém em alerta: nenhum precisa de ação", () => {
    expect(resumoCarteira(["ok", "ok"]).precisamAcao).toBe(0)
  })

  it("planilha em 13/11/2026: 6 de 10 clientes precisam de ação (3 / 3 / 4)", () => {
    expect(resumoCarteira(situacoes.values())).toEqual({
      total: 10,
      precisamAcao: 6,
      criticos: 3,
      atencao: 3,
      ok: 4,
    })
  })
})

const cliente = (id: string, nome: string): Client => ({
  id,
  nome,
  nicho: "x",
  tipo: "operacao",
  responsavel: "Squad",
  ativo: true,
})

const opp = (
  clientId: string,
  frenteId: string,
  extra: Partial<Opportunity> = {}
): Opportunity => ({
  id: `parada:${clientId}:${frenteId}`,
  tipo: "parada",
  clientId,
  frenteId,
  severidade: "media",
  estado: "atrasada",
  nunca: false,
  motivo: "m",
  diasParado: 40,
  prazoDias: 30,
  diasParaBloqueio: null,
  setorResponsavel: "Mídia paga",
  nova: false,
  ...extra,
})

describe("agruparPorCliente", () => {
  const cs = [cliente("b", "Beta"), cliente("a", "Alfa"), cliente("c", "Gama")]
  const sit = new Map<string, SituacaoCliente>([
    ["a", "atencao"],
    ["b", "critico"],
    ["c", "atencao"],
  ])

  it("um grupo por cliente com alertas, do pior cliente para o melhor", () => {
    const lista = [
      opp("a", "f1"),
      opp("c", "f1"),
      opp("b", "f1", { severidade: "alta", estado: "critica" }),
      opp("c", "f2"),
    ]
    const grupos = agruparPorCliente(lista, cs, sit)
    // crítico primeiro; entre os de atenção, mais alertas (Gama 2) antes de Alfa (1)
    expect(grupos.map((g) => g.cliente.id)).toEqual(["b", "c", "a"])
    expect(grupos.map((g) => g.alertas.length)).toEqual([1, 2, 1])
    expect(grupos[0].situacao).toBe("critico")
  })

  it("alertas do grupo: crítica > atrasada > aprovação; empate = mais dias", () => {
    const aprov = opp("a", "f3", {
      id: "aprovacao:a:f3",
      tipo: "aprovacao",
      diasParado: 99,
    })
    const atrasadaVelha = opp("a", "f1", { diasParado: 70 })
    const atrasadaNova = opp("a", "f2", { diasParado: 35 })
    const critica = opp("a", "f4", {
      severidade: "alta",
      estado: "critica",
      diasParado: 61,
    })
    const [g] = agruparPorCliente(
      [aprov, atrasadaNova, atrasadaVelha, critica],
      cs,
      sit
    )
    expect(g.alertas.map((o) => o.frenteId)).toEqual(["f4", "f1", "f2", "f3"])
  })

  it("'nunca' (diasParado nulo) é o pior caso entre críticas", () => {
    const nunca = opp("a", "f9", {
      severidade: "alta",
      estado: "critica",
      nunca: true,
      diasParado: null,
    })
    const critica = opp("a", "f4", {
      severidade: "alta",
      estado: "critica",
      diasParado: 500,
    })
    const [g] = agruparPorCliente([critica, nunca], cs, sit)
    expect(g.alertas[0].frenteId).toBe("f9")
  })

  it("não inventa grupo vazio, ignora cliente desconhecido e não muda a entrada", () => {
    const lista = [opp("a", "f1"), opp("zzz", "f1")]
    const copia = [...lista]
    const grupos = agruparPorCliente(lista, cs, sit)
    expect(grupos.map((g) => g.cliente.id)).toEqual(["a"])
    expect(lista).toEqual(copia)
    expect(agruparPorCliente([], cs, sit)).toEqual([])
  })

  it("situação ausente vira 'ok'; ordem estável entre iguais pelo nome", () => {
    const grupos = agruparPorCliente(
      [opp("c", "f1"), opp("a", "f1")],
      cs,
      new Map()
    )
    expect(grupos.map((g) => g.cliente.nome)).toEqual(["Alfa", "Gama"])
    expect(grupos.every((g) => g.situacao === "ok")).toBe(true)
  })

  it("planilha: Aurora Moda (crítico) vem primeiro, com 4 alertas; total preservado", () => {
    const grupos = agruparPorCliente(oportunidades, clients, situacoes)
    expect(grupos[0].cliente.id).toBe("aurora-moda")
    expect(grupos[0].alertas).toHaveLength(4)
    expect(grupos.reduce((s, g) => s + g.alertas.length, 0)).toBe(
      oportunidades.length
    )
    expect(grupos).toHaveLength(6)
    // Os três críticos vêm antes dos de atenção.
    expect(grupos.slice(0, 3).every((g) => g.situacao === "critico")).toBe(true)
  })

  it("alertasPorCliente conta os alertas de cada cliente", () => {
    const mapa = alertasPorCliente(oportunidades)
    expect(mapa.get("aurora-moda")).toBe(4)
    expect(mapa.get("techmania")).toBeUndefined()
    expect([...mapa.values()].reduce((a, b) => a + b, 0)).toBe(
      oportunidades.length
    )
  })
})

describe("alertasPorFrente", () => {
  const f = (id: string): Frente => ({
    id,
    nome: id,
    setor: "Mídia paga",
    prazoDias: 30,
    criticoAposDias: 60,
  })
  const st = (
    clientId: string,
    frenteId: string,
    estado: StatusFrente["estado"],
    extra: Partial<StatusFrente> = {}
  ): StatusFrente => ({
    clientId,
    frenteId,
    estado,
    nunca: false,
    dias: 10,
    prazoDias: 30,
    travada: false,
    relogio: "ultima_acao",
    diasParaBloqueio: null,
    ...extra,
  })

  it("soma atrasadas e críticas por frente e ordena pelo total", () => {
    const g = [
      st("a", "x", "atrasada"),
      st("b", "x", "critica"),
      st("c", "x", "critica"),
      st("a", "y", "atrasada"),
      st("b", "y", "atrasada"),
      st("a", "z", "em_dia"),
    ]
    const r = alertasPorFrente(g, [f("z"), f("y"), f("x")])
    expect(r.map((x) => [x.frente.id, x.criticas, x.atrasadas, x.total])).toEqual([
      ["x", 2, 1, 3],
      ["y", 0, 2, 2],
      ["z", 0, 0, 0],
    ])
  })

  it("perto do prazo, em dia e aprovação travada NÃO entram", () => {
    const g = [
      st("a", "x", "atencao"),
      st("b", "x", "em_dia", { travada: true }),
      st("c", "x", "atrasada", { travada: true }),
    ]
    const [x] = alertasPorFrente(g, [f("x")])
    expect(x.total).toBe(1)
    expect(x.atrasadas).toBe(1)
  })

  it("'nunca' conta como crítica; empate de total desempata por críticas e ordem", () => {
    const g = [
      st("a", "x", "critica", { nunca: true, dias: null }),
      st("a", "y", "atrasada"),
      st("b", "y", "atrasada"),
      st("a", "w", "critica"),
      st("b", "w", "atrasada"),
    ]
    const r = alertasPorFrente(g, [f("y"), f("x"), f("w")])
    // w (1 crítica + 1 atrasada = 2, 1 crítica) antes de y (2 atrasadas, 0 críticas)
    expect(r.map((x) => x.frente.id)).toEqual(["w", "y", "x"])
  })

  it("só considera as frentes pedidas (ex.: filtro por setor da Grade)", () => {
    const g = [st("a", "x", "critica"), st("a", "y", "critica")]
    expect(alertasPorFrente(g, [f("y")]).map((x) => x.frente.id)).toEqual(["y"])
    expect(alertasPorFrente(g, [])).toEqual([])
  })

  it("paridade na planilha: o total do gráfico = pares atrasados/críticos da Grade = alertas 'parada'", () => {
    const r = alertasPorFrente(grade, frentes)
    const problemasDaGrade = grade.filter(
      (s) => s.estado === "atrasada" || s.estado === "critica"
    ).length
    expect(r.reduce((s, x) => s + x.total, 0)).toBe(problemasDaGrade)
    expect(problemasDaGrade).toBe(
      oportunidades.filter((o) => o.tipo === "parada").length
    )
    for (const x of r) {
      expect(x.total).toBe(
        grade.filter(
          (s) =>
            s.frenteId === x.frente.id &&
            (s.estado === "atrasada" || s.estado === "critica")
        ).length
      )
    }
    // Ordenado pelo total, do maior para o menor.
    const totais = r.map((x) => x.total)
    expect(totais).toEqual([...totais].sort((a, b) => b - a))
    expect(r).toHaveLength(frentes.length)
  })

  it("planilha: frentes não contratadas (Raiz, Lumi) não geram par nem alerta", () => {
    const contratadas = new Set(
      (snapshot.contratos ?? []).map((c) => `${c.clientId}:${c.frenteId}`)
    )
    const naoContratadas = clients.flatMap((c) =>
      frentes
        .filter((fr) => !contratadas.has(`${c.id}:${fr.id}`))
        .map((fr) => `${c.id}:${fr.id}`)
    )
    // Raiz e Lumi têm frentes de fora; elas não aparecem na grade.
    expect(naoContratadas.some((k) => k.startsWith("raiz-organicos:"))).toBe(true)
    expect(naoContratadas.some((k) => k.startsWith("lumi-acessorios:"))).toBe(true)
    const chavesGrade = new Set(grade.map((s) => `${s.clientId}:${s.frenteId}`))
    for (const k of naoContratadas) expect(chavesGrade.has(k)).toBe(false)
    expect(grade).toHaveLength(contratadas.size)
    // Contagem por frente = só pares contratados.
    for (const x of alertasPorFrente(grade, frentes)) {
      const pares = grade.filter((s) => s.frenteId === x.frente.id).length
      expect(x.total).toBeLessThanOrEqual(pares)
    }
  })
})
