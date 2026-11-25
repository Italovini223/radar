/**
 * Modelo de dados no formato Kalif: cliente + frente + data (+ status).
 * Oportunidade NUNCA é guardada: é derivada pelas regras (rules.ts / opportunities.ts).
 */

export type Setor =
  | "Mídia paga"
  | "CRM & Automação"
  | "CRO & UX"
  | "Comunicação"
  | "Conteúdo"
  | "Materiais"
  | "Redação"
  | "Desenvolvimento"

export const SETORES: readonly Setor[] = [
  "Mídia paga",
  "CRM & Automação",
  "CRO & UX",
  "Comunicação",
  "Conteúdo",
  "Materiais",
  "Redação",
  "Desenvolvimento",
]

/** Frente cujo relógio é "dias sem retorno do cliente" em lojas em criação. */
export const FRENTE_DESENVOLVIMENTO_ID = "desenvolvimento"

export type TipoCliente = "operacao" | "loja_em_criacao"

export interface Client {
  id: string
  /** Nome anonimizado/fictício. */
  nome: string
  /** Nicho de atuação (ex.: "Moda", "Pet"). */
  nicho: string
  /** `loja_em_criacao` usa o relógio de retorno do cliente (ver rules.ts). */
  tipo: TipoCliente
  /** Squad responsável (nunca pessoa real). */
  responsavel: string
  ativo: boolean
}

export interface Frente {
  id: string
  nome: string
  setor: Setor
  /** Prazo máximo desejado entre ações concluídas (acima disso: atrasada). */
  prazoDias: number
  /** "Vira crítico após" N dias (coluna própria da planilha). */
  criticoAposDias: number
}

/** Frente contratada por um cliente. Par sem contrato não é avaliado. */
export interface Contrato {
  clientId: string
  frenteId: string
}

/** Parâmetros globais do motor. */
export interface Configuracao {
  /** Ação aguardando aprovação há MAIS de N dias vira alerta. */
  limiteAprovacaoDias: number
  /** Loja em criação: dias sem retorno do cliente até o bloqueio contratual. */
  bloqueioContratualDias: number
  /** "Hoje" da demonstração, ISO `yyyy-MM-dd`. */
  dataReferencia: string
  /** true = ignora `dataReferencia` e usa a data real. */
  usarHojeReal: boolean
}

export const CONFIGURACAO_PADRAO: Configuracao = {
  limiteAprovacaoDias: 5,
  bloqueioContratualDias: 90,
  dataReferencia: "2026-11-13",
  usarHojeReal: false,
}

export type StatusAcao = "concluida" | "em_andamento" | "aguardando_aprovacao"

export type OrigemAcao = "seed" | "manual" | "checkup" | "planilha"

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
  /** Quem faz/fez a ação (texto livre; nunca pessoa real nos dados fictícios). */
  responsavel?: string
  /** ISO `yyyy-MM-dd`. */
  criadaEm?: string
  /** ISO `yyyy-MM-dd`; só para status = concluida. */
  concluidaEm?: string
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
  /**
   * Frente informativa sem nenhuma ação concluída (hoje: CRO, ver
   * `FRENTES_SEM_HISTORICO_INFORMATIVO`): "sem histórico". Não é "nunca":
   * estado = em_dia, `nunca` = false, sem alerta e fora de "Problemas".
   */
  semHistorico: boolean
  /** Dias desde a última ação concluída; null se nunca. */
  dias: number | null
  prazoDias: number
  /** Data da última ação concluída, ISO; undefined se nunca. */
  ultimaAcao?: string
  /** Existe ação aguardando aprovação há mais de `limiteAprovacaoDias` neste par. */
  travada: boolean
  /** Qual relógio gerou `dias`. */
  relogio: "ultima_acao" | "retorno_cliente"
  /**
   * Só loja em criação com ação aguardando o cliente:
   * `bloqueioContratualDias - dias`. Negativo ou zero = bloqueado.
   */
  diasParaBloqueio: number | null
  /** Desde quando aguarda o cliente (retorno_cliente), ISO. */
  aguardandoDesde?: string
}

/** Situação derivada do cliente (visão de carteira). */
export type SituacaoCliente = "critico" | "atencao" | "ok"

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
  /** Loja em criação aguardando o cliente: dias até o bloqueio contratual. */
  diasParaBloqueio: number | null
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
  /**
   * Frentes contratadas por cliente. Ausente = todas contratadas
   * (compatibilidade com dados antigos).
   */
  contratos?: Contrato[]
  configuracao: Configuracao
}
