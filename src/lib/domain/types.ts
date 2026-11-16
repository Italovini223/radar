/**
 * Modelo de dados no formato Kalif: cliente + frente + data (+ status).
 * Oportunidade NUNCA é guardada: é derivada pelas regras (rules.ts / opportunities.ts).
 */

export type Setor =
  | "Mídia paga"
  | "CRM & Automação"
  | "CRO & UX"
  | "Conteúdo"
  | "Materiais"
  | "Redação"

export const SETORES: readonly Setor[] = [
  "Mídia paga",
  "CRM & Automação",
  "CRO & UX",
  "Conteúdo",
  "Materiais",
  "Redação",
]

export interface Client {
  id: string
  /** Nome anonimizado/fictício. */
  nome: string
  segmento: string
  /** Squad responsável (nunca pessoa real). */
  responsavel: string
  ativo: boolean
}

export interface Frente {
  id: string
  nome: string
  setor: Setor
  /** Prazo máximo desejado entre ações concluídas. */
  prazoDias: number
}

export type StatusAcao = "concluida" | "em_andamento" | "aguardando_aprovacao"

export type OrigemAcao = "seed" | "manual" | "checkup"

export interface Acao {
  id: string
  clientId: string
  frenteId: string
  titulo: string
  /** Data da ação, ISO `yyyy-MM-dd`. */
  data: string
  status: StatusAcao
  /** Obrigatório quando status = aguardando_aprovacao, ISO `yyyy-MM-dd`. */
  aguardandoDesde?: string
  origem?: OrigemAcao
}

export type ResultadoAds = "estavel" | "caindo" | "subindo"

/** Registro de um check-up manual (~5 min por cliente). */
export interface Checkup {
  id: string
  clientId: string
  /** Quando o check-up foi feito, ISO `yyyy-MM-dd`. */
  data: string
  /** Campo manual: resultado percebido de Ads. Não alimenta as regras. */
  resultadoAds?: ResultadoAds
}

export type EstadoFrente = "em_dia" | "atencao" | "atrasada" | "critica"

/** Situação de um par cliente x frente em um dado "hoje". */
export interface StatusFrente {
  clientId: string
  frenteId: string
  estado: EstadoFrente
  /** true quando nunca houve ação concluída (sempre estado = critica). */
  nunca: boolean
  /** Dias desde a última ação concluída; null se nunca. */
  dias: number | null
  prazoDias: number
  /** Data da última ação concluída, ISO; undefined se nunca. */
  ultimaAcao?: string
  /** Existe ação aguardando aprovação há mais de 7 dias neste par. */
  travada: boolean
}

export type TipoOportunidade = "parada" | "aprovacao"
export type Severidade = "alta" | "media"

export interface Opportunity {
  /** Determinístico: `${tipo}:${clientId}:${frenteId}`. */
  id: string
  tipo: TipoOportunidade
  clientId: string
  frenteId: string
  severidade: Severidade
  estado: EstadoFrente
  nunca: boolean
  motivo: string
  /** Dias parado (parada) ou dias aguardando aprovação (aprovacao). */
  diasParado: number | null
  prazoDias: number
  setorResponsavel: Setor
  /** "Nova" = acabou de cruzar o prazo (ver `JANELA_NOVA_DIAS`). */
  nova: boolean
}

/** Atribuição de uma oportunidade a um setor (gravada no store). */
export interface Atribuicao {
  oportunidadeId: string
  setor: Setor
  /** ISO `yyyy-MM-dd`. */
  data: string
  texto: string
}

export interface RadarSnapshot {
  clients: Client[]
  frentes: Frente[]
  acoes: Acao[]
  checkups: Checkup[]
  atribuicoes: Atribuicao[]
}
