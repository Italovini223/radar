import { format, isValid, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

import { formatarDias } from "./opportunities"
import type {
  Configuracao,
  Frente,
  SituacaoCliente,
} from "./types"

/** Textos de tela que dependem de regra. Puros, para testar sem renderizar. */

/** "13 nov. 2026" (o mês abreviado do date-fns vem sem ponto). */
export function dataCurta(iso: string): string {
  const d = parseISO(iso)
  if (!isValid(d)) return iso
  return `${format(d, "d MMM", { locale: ptBR })}. ${format(d, "yyyy")}`
}

/** Subtítulo do Radar: deixa claro de que dia são os números. */
export function rotuloDataReferencia(
  config: Pick<Configuracao, "dataReferencia" | "usarHojeReal">,
  hoje: Date
): string {
  if (config.usarHojeReal) {
    return `Hoje: ${dataCurta(format(hoje, "yyyy-MM-dd"))}`
  }
  return `Data de referência: ${dataCurta(config.dataReferencia)} (demonstração)`
}

export const ROTULO_SITUACAO: Record<SituacaoCliente, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  ok: "Ok",
}

/** Loja em criação aguardando o cliente usa outro relógio. */
export function semRetornoDoCliente(o: {
  diasParaBloqueio: number | null
}): boolean {
  return o.diasParaBloqueio !== null
}

export function rotuloRelogio(o: { diasParaBloqueio: number | null }): string {
  return semRetornoDoCliente(o) ? "Sem retorno do cliente há" : "Parado há"
}

/** Linha curta do cartão: "bloqueio em 24 dias". */
export function bloqueioCurto(diasParaBloqueio: number): string {
  if (diasParaBloqueio > 1) return `bloqueio em ${diasParaBloqueio} dias`
  if (diasParaBloqueio === 1) return "bloqueio em 1 dia"
  if (diasParaBloqueio === 0) return "bloqueio hoje"
  return `bloqueado há ${formatarDias(-diasParaBloqueio)}`
}

/** Bloco da ficha de loja em criação. */
export function textoBlocoBloqueio(
  diasSemRetorno: number,
  diasParaBloqueio: number,
  bloqueioContratualDias: number
): string {
  const base = `Sem retorno do cliente há ${formatarDias(diasSemRetorno)}`
  if (diasParaBloqueio <= 0) {
    return `${base} · bloqueado: o limite contratual de ${bloqueioContratualDias} dias foi atingido`
  }
  const faltam =
    diasParaBloqueio === 1
      ? "falta 1 dia"
      : `faltam ${diasParaBloqueio} dias`
  return `${base} · ${faltam} para o bloqueio contratual (${bloqueioContratualDias} dias)`
}

/** Título sugerido (editável) ao registrar ação a partir de um alerta. */
export function tituloSugerido(frente: Pick<Frente, "id" | "nome">): string {
  switch (frente.id) {
    case "google-ads":
    case "meta-ads":
      return `Otimização de ${frente.nome} feita hoje`
    case "crm":
      return `Revisão de ${frente.nome} feita hoje`
    case "conteudo":
      return `Entrega de ${frente.nome} feita hoje`
    case "materiais":
      return "Entrega de materiais feita hoje"
    case "redacao":
      return "Entrega de redação feita hoje"
    case "desenvolvimento":
      return "Avanço no desenvolvimento da loja registrado hoje"
    case "cro":
      return "Melhoria no site (CRO) feita hoje"
    default:
      return `Ação em ${frente.nome} feita hoje`
  }
}
