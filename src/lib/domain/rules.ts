import { differenceInCalendarDays, format, parseISO } from "date-fns"

import type {
  Acao,
  Client,
  EstadoFrente,
  Frente,
  StatusFrente,
} from "./types"

/**
 * Regras de alerta determinísticas (sem IA). Funções PURAS: "hoje" (`now`)
 * é sempre parâmetro, para teste e demo reprodutíveis.
 *
 * Para cada par cliente x frente, dias = hoje - última ação CONCLUÍDA:
 *   em_dia   : dias < 75% do prazo
 *   atencao  : 75% <= dias <= 100% do prazo
 *   atrasada : 100% < dias <= 150% do prazo
 *   critica  : dias > 150% do prazo, ou nunca teve ação
 */
export const LIMIAR_ATENCAO = 0.75
export const LIMIAR_ATRASADA = 1
export const LIMIAR_CRITICA = 1.5
/** Ação aguardando aprovação há MAIS de N dias vira alerta "travada". */
export const DIAS_APROVACAO_TRAVADA = 7
/** Oportunidade "nova": venceu o prazo há no máximo N dias. */
export const JANELA_NOVA_DIAS = 14

export const ISO_DATE = "yyyy-MM-dd"

export function toISODate(d: Date): string {
  return format(d, ISO_DATE)
}

/** Dias corridos (calendário) entre `dataISO` e `now`. */
export function diasDesde(dataISO: string, now: Date): number {
  return differenceInCalendarDays(now, parseISO(dataISO))
}

export function classificarDias(
  dias: number | null,
  prazoDias: number
): { estado: EstadoFrente; nunca: boolean } {
  if (dias === null) return { estado: "critica", nunca: true }
  const ratio = dias / prazoDias
  if (ratio < LIMIAR_ATENCAO) return { estado: "em_dia", nunca: false }
  if (ratio <= LIMIAR_ATRASADA) return { estado: "atencao", nunca: false }
  if (ratio <= LIMIAR_CRITICA) return { estado: "atrasada", nunca: false }
  return { estado: "critica", nunca: false }
}

export function ultimaAcaoConcluida(
  acoes: readonly Acao[],
  clientId: string,
  frenteId: string
): Acao | undefined {
  let melhor: Acao | undefined
  for (const a of acoes) {
    if (a.clientId !== clientId || a.frenteId !== frenteId) continue
    if (a.status !== "concluida") continue
    if (!melhor || a.data > melhor.data) melhor = a
  }
  return melhor
}

/** Ações aguardando aprovação há mais de `DIAS_APROVACAO_TRAVADA` dias. */
export function acoesTravadas(acoes: readonly Acao[], now: Date): Acao[] {
  return acoes.filter(
    (a) =>
      a.status === "aguardando_aprovacao" &&
      diasDesde(a.aguardandoDesde ?? a.data, now) > DIAS_APROVACAO_TRAVADA
  )
}

export function avaliarFrente(
  acoes: readonly Acao[],
  clientId: string,
  frente: Frente,
  now: Date
): StatusFrente {
  const ultima = ultimaAcaoConcluida(acoes, clientId, frente.id)
  const dias = ultima ? diasDesde(ultima.data, now) : null
  const { estado, nunca } = classificarDias(dias, frente.prazoDias)
  const travada = acoesTravadas(
    acoes.filter((a) => a.clientId === clientId && a.frenteId === frente.id),
    now
  ).length > 0
  return {
    clientId,
    frenteId: frente.id,
    estado,
    nunca,
    dias,
    prazoDias: frente.prazoDias,
    ultimaAcao: ultima?.data,
    travada,
  }
}

/** Grade completa cliente x frente (apenas clientes ativos). */
export function montarGrade(
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date
): StatusFrente[] {
  const out: StatusFrente[] = []
  for (const c of clients) {
    if (!c.ativo) continue
    for (const f of frentes) out.push(avaliarFrente(acoes, c.id, f, now))
  }
  return out
}

export const ESTADO_ORDEM: Record<EstadoFrente, number> = {
  critica: 3,
  atrasada: 2,
  atencao: 1,
  em_dia: 0,
}
