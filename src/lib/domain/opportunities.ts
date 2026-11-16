import {
  DIAS_APROVACAO_TRAVADA,
  JANELA_NOVA_DIAS,
  acoesTravadas,
  diasDesde,
  montarGrade,
} from "./rules"
import type {
  Acao,
  Client,
  Frente,
  Opportunity,
  StatusFrente,
} from "./types"

export function formatarDias(dias: number): string {
  if (dias >= 365) {
    const anos = Math.floor(dias / 365)
    return `${anos} ${anos === 1 ? "ano" : "anos"}`
  }
  return `${dias} ${dias === 1 ? "dia" : "dias"}`
}

function motivoParada(frente: Frente, s: StatusFrente): string {
  if (s.nunca) return `${frente.nome} sem nenhuma ação registrada`
  return `${frente.nome} sem ação há ${formatarDias(s.dias ?? 0)} (prazo: ${frente.prazoDias} dias)`
}

/** Razão dias/prazo usada para ordenar; "nunca" é o pior caso. */
function peso(o: Opportunity): number {
  if (o.diasParado === null) return Number.POSITIVE_INFINITY
  return o.tipo === "aprovacao"
    ? o.diasParado / DIAS_APROVACAO_TRAVADA
    : o.diasParado / o.prazoDias
}

/**
 * Oportunidade = todo par atrasada/critica + as ações travadas em aprovação.
 * Prioridade alta = critica. Derivada, nunca guardada.
 */
export function derivarOportunidades(
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date
): Opportunity[] {
  const frentePorId = new Map(frentes.map((f) => [f.id, f]))
  const ativos = new Set(clients.filter((c) => c.ativo).map((c) => c.id))
  const grade = montarGrade(clients, frentes, acoes, now)
  const out: Opportunity[] = []

  for (const s of grade) {
    if (s.estado !== "atrasada" && s.estado !== "critica") continue
    const frente = frentePorId.get(s.frenteId)
    if (!frente) continue
    out.push({
      id: `parada:${s.clientId}:${s.frenteId}`,
      tipo: "parada",
      clientId: s.clientId,
      frenteId: s.frenteId,
      severidade: s.estado === "critica" ? "alta" : "media",
      estado: s.estado,
      nunca: s.nunca,
      motivo: motivoParada(frente, s),
      diasParado: s.dias,
      prazoDias: frente.prazoDias,
      setorResponsavel: frente.setor,
      nova: !s.nunca && (s.dias ?? 0) - frente.prazoDias <= JANELA_NOVA_DIAS,
    })
  }

  // Aprovação travada: uma oportunidade por par, usando a ação mais antiga.
  const vistos = new Set<string>()
  const travadas = acoesTravadas(acoes, now)
    .filter((a) => ativos.has(a.clientId))
    .sort((a, b) =>
      (a.aguardandoDesde ?? a.data).localeCompare(b.aguardandoDesde ?? b.data)
    )
  for (const a of travadas) {
    const chave = `${a.clientId}:${a.frenteId}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const frente = frentePorId.get(a.frenteId)
    if (!frente) continue
    const dias = diasDesde(a.aguardandoDesde ?? a.data, now)
    const grade1 = grade.find(
      (g) => g.clientId === a.clientId && g.frenteId === a.frenteId
    )
    out.push({
      id: `aprovacao:${a.clientId}:${a.frenteId}`,
      tipo: "aprovacao",
      clientId: a.clientId,
      frenteId: a.frenteId,
      severidade: "media",
      estado: grade1?.estado ?? "em_dia",
      nunca: false,
      motivo: `"${a.titulo}" aguarda aprovação há ${formatarDias(dias)}`,
      diasParado: dias,
      prazoDias: frente.prazoDias,
      setorResponsavel: frente.setor,
      nova: dias - DIAS_APROVACAO_TRAVADA <= JANELA_NOVA_DIAS,
    })
  }

  // Ordem: severidade (alta primeiro), paradas antes de aprovações, pior razão
  // dias/prazo primeiro ("nunca" é o pior caso), desempate estável por id.
  const rankSeveridade = (o: Opportunity) => (o.severidade === "alta" ? 0 : 1)
  const rankTipo = (o: Opportunity) => (o.tipo === "parada" ? 0 : 1)
  return out.sort((a, b) => {
    const pa = peso(a)
    const pb = peso(b)
    return (
      rankSeveridade(a) - rankSeveridade(b) ||
      rankTipo(a) - rankTipo(b) ||
      (pa === pb ? 0 : pa > pb ? -1 : 1) ||
      a.id.localeCompare(b.id)
    )
  })
}

export interface Metricas {
  clientesAtivos: number
  oportunidades: number
  clientesComOportunidade: number
  novas: number
  prioritarias: number
  frentesEmAtencao: number
  frentesCriticas: number
  aguardandoAprovacao: number
  aprovacaoTravada: number
}

export function calcularMetricas(
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date
): Metricas {
  const grade = montarGrade(clients, frentes, acoes, now)
  const opps = derivarOportunidades(clients, frentes, acoes, now)
  const ativos = new Set(clients.filter((c) => c.ativo).map((c) => c.id))
  const aguardando = acoes.filter(
    (a) => a.status === "aguardando_aprovacao" && ativos.has(a.clientId)
  )
  return {
    clientesAtivos: ativos.size,
    oportunidades: opps.length,
    clientesComOportunidade: new Set(opps.map((o) => o.clientId)).size,
    novas: opps.filter((o) => o.nova).length,
    prioritarias: opps.filter((o) => o.severidade === "alta").length,
    frentesEmAtencao: grade.filter((s) => s.estado !== "em_dia").length,
    frentesCriticas: grade.filter((s) => s.estado === "critica").length,
    aguardandoAprovacao: aguardando.length,
    aprovacaoTravada: acoesTravadas(aguardando, now).length,
  }
}
