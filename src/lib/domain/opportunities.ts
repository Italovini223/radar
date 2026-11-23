import {
  DIAS_APROVACAO_TRAVADA,
  JANELA_NOVA_DIAS,
  criarContratado,
  desdeAguardando,
  diasDesde,
  montarGrade,
  situacoesDaCarteira,
  travadasDaCarteira,
  type ContextoRegras,
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

/** "faltam 24 dias para o bloqueio contratual" (ou já atingido). */
export function textoBloqueio(diasParaBloqueio: number): string {
  if (diasParaBloqueio > 1) {
    return `faltam ${diasParaBloqueio} dias para o bloqueio contratual`
  }
  if (diasParaBloqueio === 1) return "falta 1 dia para o bloqueio contratual"
  if (diasParaBloqueio === 0) return "bloqueio contratual atingido hoje"
  return `bloqueio contratual atingido há ${formatarDias(-diasParaBloqueio)}`
}

function motivoParada(frente: Frente, s: StatusFrente): string {
  if (s.nunca) return `${frente.nome} sem nenhuma ação registrada`
  if (s.relogio === "retorno_cliente") {
    const base = `${frente.nome} sem retorno do cliente há ${formatarDias(s.dias ?? 0)} (prazo: ${frente.prazoDias} dias)`
    return s.diasParaBloqueio === null
      ? base
      : `${base}; ${textoBloqueio(s.diasParaBloqueio)}`
  }
  return `${frente.nome} sem ação há ${formatarDias(s.dias ?? 0)} (prazo: ${frente.prazoDias} dias)`
}

/** Razão dias/prazo usada para ordenar; "nunca" é o pior caso. */
function peso(o: Opportunity, limiteAprovacao: number): number {
  if (o.diasParado === null) return Number.POSITIVE_INFINITY
  return o.tipo === "aprovacao"
    ? o.diasParado / limiteAprovacao
    : o.diasParado / o.prazoDias
}

/**
 * Oportunidade = todo par contratado atrasada/critica + as ações travadas em
 * aprovação. "Atenção" (perto do prazo) NÃO gera oportunidade.
 * Prioridade alta = critica. Derivada, nunca guardada.
 */
export function derivarOportunidades(
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): Opportunity[] {
  const frentePorId = new Map(frentes.map((f) => [f.id, f]))
  const limiteAprovacao = ctx.limiteAprovacaoDias ?? DIAS_APROVACAO_TRAVADA
  const grade = montarGrade(clients, frentes, acoes, now, ctx)
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
      diasParaBloqueio: s.diasParaBloqueio,
      setorResponsavel: frente.setor,
      nova: !s.nunca && (s.dias ?? 0) - frente.prazoDias <= JANELA_NOVA_DIAS,
    })
  }

  // Aprovação travada: uma oportunidade por par, usando a ação mais antiga.
  const vistos = new Set<string>()
  const travadas = travadasDaCarteira(clients, acoes, now, ctx).sort((a, b) =>
    desdeAguardando(a).localeCompare(desdeAguardando(b))
  )
  for (const a of travadas) {
    const chave = `${a.clientId}:${a.frenteId}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const frente = frentePorId.get(a.frenteId)
    if (!frente) continue
    const dias = diasDesde(desdeAguardando(a), now)
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
      diasParaBloqueio: null,
      setorResponsavel: frente.setor,
      nova: dias - limiteAprovacao <= JANELA_NOVA_DIAS,
    })
  }

  // Ordem: severidade (alta primeiro), paradas antes de aprovações, pior razão
  // dias/prazo primeiro ("nunca" é o pior caso), desempate estável por id.
  const rankSeveridade = (o: Opportunity) => (o.severidade === "alta" ? 0 : 1)
  const rankTipo = (o: Opportunity) => (o.tipo === "parada" ? 0 : 1)
  return out.sort((a, b) => {
    const pa = peso(a, limiteAprovacao)
    const pb = peso(b, limiteAprovacao)
    return (
      rankSeveridade(a) - rankSeveridade(b) ||
      rankTipo(a) - rankTipo(b) ||
      (pa === pb ? 0 : pa > pb ? -1 : 1) ||
      a.id.localeCompare(b.id)
    )
  })
}

/** Alertas (oportunidades) de um cliente, já na ordem do Radar. */
export function alertasDoCliente(
  clientId: string,
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): Opportunity[] {
  return derivarOportunidades(
    clients.filter((c) => c.id === clientId),
    frentes,
    acoes,
    now,
    ctx
  )
}

/** Gravidade para escolher a "próxima oportunidade": crítica > atrasada > aprovação. */
export function rankOportunidade(o: Opportunity): number {
  if (o.tipo === "aprovacao") return 1
  return o.estado === "critica" ? 3 : 2
}

/**
 * Próxima oportunidade sugerida de um cliente: a de maior severidade
 * (crítica > atrasada > aprovação travada); empate = mais dias parado
 * ("nunca" é o pior caso). `null` se o cliente não tem alertas.
 */
export function proximaOportunidade(
  clientId: string,
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): Opportunity | null {
  const diasOuMax = (o: Opportunity) =>
    o.diasParado === null ? Number.POSITIVE_INFINITY : o.diasParado
  const lista = alertasDoCliente(clientId, clients, frentes, acoes, now, ctx)
  let melhor: Opportunity | null = null
  for (const o of lista) {
    if (
      !melhor ||
      rankOportunidade(o) > rankOportunidade(melhor) ||
      (rankOportunidade(o) === rankOportunidade(melhor) &&
        diasOuMax(o) > diasOuMax(melhor))
    ) {
      melhor = o
    }
  }
  return melhor
}

export interface Metricas {
  clientesAtivos: number
  clientesCriticos: number
  clientesAtencao: number
  clientesOk: number
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
  now: Date,
  ctx: ContextoRegras = {}
): Metricas {
  const grade = montarGrade(clients, frentes, acoes, now, ctx)
  const opps = derivarOportunidades(clients, frentes, acoes, now, ctx)
  const situacoes = [...situacoesDaCarteira(clients, frentes, acoes, now, ctx).values()]
  const ativos = new Set(clients.filter((c) => c.ativo).map((c) => c.id))
  const contratado = criarContratado(ctx.contratos)
  const aguardando = acoes.filter(
    (a) =>
      a.status === "aguardando_aprovacao" &&
      ativos.has(a.clientId) &&
      contratado(a.clientId, a.frenteId)
  )
  return {
    clientesAtivos: ativos.size,
    clientesCriticos: situacoes.filter((x) => x === "critico").length,
    clientesAtencao: situacoes.filter((x) => x === "atencao").length,
    clientesOk: situacoes.filter((x) => x === "ok").length,
    oportunidades: opps.length,
    clientesComOportunidade: new Set(opps.map((o) => o.clientId)).size,
    novas: opps.filter((o) => o.nova).length,
    prioritarias: opps.filter((o) => o.severidade === "alta").length,
    frentesEmAtencao: grade.filter((s) => s.estado !== "em_dia").length,
    frentesCriticas: grade.filter((s) => s.estado === "critica").length,
    aguardandoAprovacao: aguardando.length,
    aprovacaoTravada: travadasDaCarteira(clients, acoes, now, ctx).length,
  }
}
