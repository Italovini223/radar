import type { Opportunity, StatusAcao } from "./types"
import { escolherProxima } from "./opportunities"

/**
 * Resumo do que mudou para um cliente depois de registrar uma ação (ou um
 * check-up): compara as oportunidades do cliente ANTES e DEPOIS. Funções
 * puras; a tela só desenha o resultado.
 */
export interface ResumoPosAcao {
  clientId: string
  /** Frentes onde a ação foi registrada. */
  frenteIds: string[]
  status: StatusAcao
  /** Alertas do cliente que existiam antes e sumiram. */
  resolvidas: Opportunity[]
  /** Alertas da frente registrada que continuam (a ação não os resolve). */
  semEfeito: Opportunity[]
  /** A de maior severidade entre as que sobraram. */
  proxima: Opportunity | null
  pendentes: number
}

export function resumoPosAcao(entrada: {
  clientId: string
  frenteIds: readonly string[]
  status: StatusAcao
  antes: readonly Opportunity[]
  depois: readonly Opportunity[]
}): ResumoPosAcao {
  const antes = entrada.antes.filter((o) => o.clientId === entrada.clientId)
  const depois = entrada.depois.filter((o) => o.clientId === entrada.clientId)
  const idsDepois = new Set(depois.map((o) => o.id))
  const resolvidas = antes.filter((o) => !idsDepois.has(o.id))
  const frentes = new Set(entrada.frenteIds)
  const semEfeito = depois.filter(
    (o) => frentes.has(o.frenteId) && antes.some((a) => a.id === o.id)
  )
  return {
    clientId: entrada.clientId,
    frenteIds: [...entrada.frenteIds],
    status: entrada.status,
    resolvidas,
    semEfeito,
    proxima: escolherProxima(depois),
    pendentes: depois.length,
  }
}

export type TomPosAcao = "resolvido" | "neutro" | "sem_efeito"

export interface TextosPosAcao {
  tom: TomPosAcao
  titulo: string
  detalhe: string | null
  /** Próxima oportunidade sugerida (null = nada pendente). */
  proxima: { titulo: string; frente: string; motivo: string } | null
  /** Texto quando não sobrou alerta. */
  vazio: string | null
}

const LEMBRETE_STATUS: Record<StatusAcao, string | null> = {
  concluida: null,
  em_andamento:
    "Ação em andamento não zera o contador da frente: só ação concluída resolve o alerta.",
  aguardando_aprovacao:
    "Ação aguardando aprovação não zera o contador da frente: só ação concluída resolve o alerta.",
}

export function textosPosAcao(
  r: ResumoPosAcao,
  nomes: { cliente: string; frente: (frenteId: string) => string }
): TextosPosAcao {
  let tom: TomPosAcao
  let titulo: string
  let detalhe: string | null = null

  if (r.resolvidas.length === 1) {
    tom = "resolvido"
    titulo = `Alerta resolvido: ${nomes.frente(r.resolvidas[0].frenteId)} de ${nomes.cliente}`
  } else if (r.resolvidas.length > 1) {
    tom = "resolvido"
    const lista = r.resolvidas.map((o) => nomes.frente(o.frenteId)).join(", ")
    titulo = `Alertas resolvidos de ${nomes.cliente}: ${lista}`
  } else if (r.semEfeito.length > 0) {
    tom = "sem_efeito"
    const lista = [...new Set(r.semEfeito.map((o) => nomes.frente(o.frenteId)))].join(", ")
    titulo = `Ação registrada, mas o alerta de ${lista} continua`
    detalhe =
      LEMBRETE_STATUS[r.status] ??
      (r.semEfeito.some((o) => o.diasParaBloqueio !== null)
        ? "Em loja em criação o relógio só reinicia quando o cliente dá retorno."
        : "A data informada ainda está além do prazo da frente.")
  } else {
    tom = "neutro"
    const lista = r.frenteIds.map(nomes.frente).join(", ")
    titulo = lista
      ? `Ação registrada em ${lista}`
      : `Ação registrada para ${nomes.cliente}`
    detalhe =
      LEMBRETE_STATUS[r.status] ??
      "Nenhum alerta mudou: essa frente já estava dentro do prazo."
  }

  return {
    tom,
    titulo,
    detalhe,
    proxima: r.proxima
      ? {
          titulo: "Próxima oportunidade sugerida",
          frente: nomes.frente(r.proxima.frenteId),
          motivo: r.proxima.motivo,
        }
      : null,
    vazio: r.proxima ? null : `Nenhum alerta pendente para ${nomes.cliente}`,
  }
}
