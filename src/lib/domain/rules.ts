import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns"

import {
  CONFIGURACAO_PADRAO,
  FRENTE_DESENVOLVIMENTO_ID,
  type Acao,
  type Client,
  type Configuracao,
  type Contrato,
  type EstadoFrente,
  type Frente,
  type SituacaoCliente,
  type StatusFrente,
  type TipoCliente,
} from "./types"

/**
 * Regras de alerta determinísticas (sem IA), alinhadas à planilha do gabarito.
 * Funções PURAS: "hoje" (`now`) é sempre parâmetro, para teste e demo
 * reprodutíveis.
 *
 * Para cada par cliente x frente CONTRATADO, dias = hoje - última ação
 * CONCLUÍDA:
 *   em_dia   : dias < 75% do prazo
 *   atencao  : 75% do prazo <= dias <= prazo   (aviso "perto do prazo",
 *              NÃO gera oportunidade nem alerta)
 *   atrasada : prazo < dias < criticoAposDias
 *   critica  : dias >= criticoAposDias, ou nunca teve ação
 *
 * Aprovação travada: ação aguardando aprovação há MAIS de
 * `limiteAprovacaoDias` dias (padrão 5).
 *
 * Sem histórico (regra da planilha, "CRO: revisão a cada 6 meses"): frente
 * listada em `FRENTES_SEM_HISTORICO_INFORMATIVO` (hoje o CRO) sem NENHUMA ação
 * concluída NÃO é "nunca teve ação"/crítica: fica informativa ("sem
 * histórico"), em_dia, sem alerta nem oportunidade, fora de "Problemas".
 *
 * Situação do cliente (planilha, "Regras usadas"): ALERTA = par atrasado ou
 * crítico + par com aprovação travada (os mesmos itens das oportunidades).
 * Crítico = alguma frente crítica OU 2+ alertas; Atenção = 1 alerta; Ok = 0
 * (avisos de "perto do prazo" e "sem histórico" não contam).
 *
 * Loja em criação (cliente tipo `loja_em_criacao` x frente `desenvolvimento`):
 * o relógio é "dias sem retorno do cliente" = dias desde a ação aguardando
 * mais antiga; vale 30/60 e o bloqueio contratual em `bloqueioContratualDias`
 * (90). A regra de aprovação travada NÃO se aplica a esse par.
 */
export const LIMIAR_ATENCAO = 0.75
/** Padrão de aprovação travada; o valor efetivo vem de `Configuracao`. */
export const DIAS_APROVACAO_TRAVADA = CONFIGURACAO_PADRAO.limiteAprovacaoDias
/** Oportunidade "nova": venceu o prazo há no máximo N dias. */
export const JANELA_NOVA_DIAS = 14

/**
 * Frentes "informativas" quando o cliente não tem nenhuma ação concluída:
 * mostram "sem histórico" em vez de "nunca teve ação" (crítica). Hoje só o CRO
 * (revisão a cada 6 meses, sem obrigação de histórico prévio).
 * DÍVIDA: virar coluna da tabela de frentes no banco; por ora é constante de
 * domínio, para não mexer no schema.
 */
export const FRENTES_SEM_HISTORICO_INFORMATIVO: ReadonlySet<string> = new Set([
  "cro",
])

export const ISO_DATE = "yyyy-MM-dd"

export function toISODate(d: Date): string {
  return format(d, ISO_DATE)
}

/** Dias corridos (calendário) entre `dataISO` e `now`. */
export function diasDesde(dataISO: string, now: Date): number {
  return differenceInCalendarDays(now, parseISO(dataISO))
}

/**
 * "Hoje" do app: a data de referência da demonstração, ou a data real quando
 * `usarHojeReal` está ligado (ou a data de referência é inválida).
 */
export function agoraDaConfiguracao(
  config: Pick<Configuracao, "dataReferencia" | "usarHojeReal">,
  hojeReal: Date
): Date {
  if (config.usarHojeReal) return hojeReal
  const ref = parseISO(config.dataReferencia)
  return isValid(ref) ? ref : hojeReal
}

/** Parâmetros opcionais que as funções da carteira aceitam. */
export interface ContextoRegras {
  /** Ausente = todas as frentes contratadas por todos os clientes. */
  contratos?: readonly Contrato[]
  limiteAprovacaoDias?: number
  bloqueioContratualDias?: number
}

export function contextoDoSnapshot(s: {
  contratos?: readonly Contrato[]
  configuracao?: Partial<Configuracao>
}): ContextoRegras {
  return {
    contratos: s.contratos,
    limiteAprovacaoDias: s.configuracao?.limiteAprovacaoDias,
    bloqueioContratualDias: s.configuracao?.bloqueioContratualDias,
  }
}

/** Predicado "o cliente contratou a frente?" (sem contratos: sempre sim). */
export function criarContratado(
  contratos: readonly Contrato[] | undefined
): (clientId: string, frenteId: string) => boolean {
  if (!contratos) return () => true
  const chaves = new Set(contratos.map((c) => `${c.clientId}\u0000${c.frenteId}`))
  return (clientId, frenteId) => chaves.has(`${clientId}\u0000${frenteId}`)
}

/** Par que usa o relógio de retorno do cliente (loja em criação). */
export function ehLojaEmCriacao(
  tipo: TipoCliente | undefined,
  frenteId: string
): boolean {
  return tipo === "loja_em_criacao" && frenteId === FRENTE_DESENVOLVIMENTO_ID
}

export function classificarDias(
  dias: number | null,
  prazoDias: number,
  criticoAposDias: number = prazoDias * 2
): { estado: EstadoFrente; nunca: boolean } {
  if (dias === null) return { estado: "critica", nunca: true }
  if (dias >= criticoAposDias) return { estado: "critica", nunca: false }
  if (dias > prazoDias) return { estado: "atrasada", nunca: false }
  if (dias >= prazoDias * LIMIAR_ATENCAO) {
    return { estado: "atencao", nunca: false }
  }
  return { estado: "em_dia", nunca: false }
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

/** Início da espera de uma ação aguardando aprovação. */
export function desdeAguardando(a: Acao): string {
  return a.aguardandoDesde ?? a.data
}

/** Ações aguardando aprovação há mais de `limite` dias. */
export function acoesTravadas(
  acoes: readonly Acao[],
  now: Date,
  limite: number = DIAS_APROVACAO_TRAVADA
): Acao[] {
  return acoes.filter(
    (a) =>
      a.status === "aguardando_aprovacao" &&
      diasDesde(desdeAguardando(a), now) > limite
  )
}

/** Ação aguardando há mais tempo (a mais antiga), se houver. */
export function aguardandoMaisAntiga(
  acoes: readonly Acao[],
  clientId: string,
  frenteId: string
): Acao | undefined {
  let melhor: Acao | undefined
  for (const a of acoes) {
    if (a.clientId !== clientId || a.frenteId !== frenteId) continue
    if (a.status !== "aguardando_aprovacao") continue
    if (!melhor || desdeAguardando(a) < desdeAguardando(melhor)) melhor = a
  }
  return melhor
}

export interface OpcoesAvaliacao {
  /** Necessário para a regra de loja em criação. */
  tipoCliente?: TipoCliente
  limiteAprovacaoDias?: number
  bloqueioContratualDias?: number
}

export function avaliarFrente(
  acoes: readonly Acao[],
  clientId: string,
  frente: Frente,
  now: Date,
  opcoes: OpcoesAvaliacao = {}
): StatusFrente {
  const limite = opcoes.limiteAprovacaoDias ?? CONFIGURACAO_PADRAO.limiteAprovacaoDias
  const bloqueio =
    opcoes.bloqueioContratualDias ?? CONFIGURACAO_PADRAO.bloqueioContratualDias
  const doPar = acoes.filter(
    (a) => a.clientId === clientId && a.frenteId === frente.id
  )
  const ultima = ultimaAcaoConcluida(doPar, clientId, frente.id)
  const loja = ehLojaEmCriacao(opcoes.tipoCliente, frente.id)
  const aguardando = loja
    ? aguardandoMaisAntiga(doPar, clientId, frente.id)
    : undefined

  if (aguardando) {
    const desde = desdeAguardando(aguardando)
    const dias = diasDesde(desde, now)
    const { estado } = classificarDias(dias, frente.prazoDias, frente.criticoAposDias)
    return {
      clientId,
      frenteId: frente.id,
      estado,
      nunca: false,
      dias,
      prazoDias: frente.prazoDias,
      ultimaAcao: ultima?.data,
      travada: false,
      relogio: "retorno_cliente",
      diasParaBloqueio: bloqueio - dias,
      aguardandoDesde: desde,
      semHistorico: false,
    }
  }

  const dias = ultima ? diasDesde(ultima.data, now) : null
  const semHistorico =
    !ultima && FRENTES_SEM_HISTORICO_INFORMATIVO.has(frente.id)
  const { estado, nunca } = semHistorico
    ? { estado: "em_dia" as const, nunca: false }
    : classificarDias(dias, frente.prazoDias, frente.criticoAposDias)
  return {
    clientId,
    frenteId: frente.id,
    estado,
    nunca,
    semHistorico,
    dias,
    prazoDias: frente.prazoDias,
    ultimaAcao: ultima?.data,
    travada: !loja && acoesTravadas(doPar, now, limite).length > 0,
    relogio: "ultima_acao",
    diasParaBloqueio: null,
  }
}

/** Opções de avaliação de um cliente a partir do contexto da carteira. */
export function opcoesDoCliente(
  cliente: Pick<Client, "tipo">,
  ctx: ContextoRegras
): OpcoesAvaliacao {
  return {
    tipoCliente: cliente.tipo,
    limiteAprovacaoDias: ctx.limiteAprovacaoDias,
    bloqueioContratualDias: ctx.bloqueioContratualDias,
  }
}

/**
 * Grade cliente x frente: só clientes ativos e só frentes contratadas
 * (sem `ctx.contratos`, todas).
 */
export function montarGrade(
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): StatusFrente[] {
  const contratado = criarContratado(ctx.contratos)
  const out: StatusFrente[] = []
  for (const c of clients) {
    if (!c.ativo) continue
    const opcoes = opcoesDoCliente(c, ctx)
    for (const f of frentes) {
      if (!contratado(c.id, f.id)) continue
      out.push(avaliarFrente(acoes, c.id, f, now, opcoes))
    }
  }
  return out
}

/**
 * Ações travadas em aprovação da carteira: só clientes ativos, só pares
 * contratados, e fora da frente de desenvolvimento de loja em criação.
 */
export function travadasDaCarteira(
  clients: readonly Client[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): Acao[] {
  const contratado = criarContratado(ctx.contratos)
  const porId = new Map(clients.map((c) => [c.id, c]))
  const limite = ctx.limiteAprovacaoDias ?? CONFIGURACAO_PADRAO.limiteAprovacaoDias
  return acoesTravadas(acoes, now, limite).filter((a) => {
    const c = porId.get(a.clientId)
    if (!c || !c.ativo) return false
    if (!contratado(a.clientId, a.frenteId)) return false
    return !ehLojaEmCriacao(c.tipo, a.frenteId)
  })
}

/**
 * Alertas do cliente = pares atrasados ou críticos + pares com aprovação
 * travada (cada par conta uma vez em cada tipo, como as oportunidades).
 */
export function contarAlertas(grade: readonly StatusFrente[]): number {
  let n = 0
  for (const g of grade) {
    if (g.estado === "atrasada" || g.estado === "critica") n++
    if (g.travada) n++
  }
  return n
}

/**
 * Crítico = alguma frente crítica OU 2+ alertas; atenção = 1 alerta; senão ok.
 */
export function situacaoDaGrade(grade: readonly StatusFrente[]): SituacaoCliente {
  if (grade.some((g) => g.estado === "critica")) return "critico"
  const alertas = contarAlertas(grade)
  if (alertas >= 2) return "critico"
  return alertas === 1 ? "atencao" : "ok"
}

export function situacaoDoCliente(
  clientId: string,
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): SituacaoCliente {
  const alvo = clients.filter((c) => c.id === clientId)
  return situacaoDaGrade(montarGrade(alvo, frentes, acoes, now, ctx))
}

/** Situação de todos os clientes ativos, calculada de uma vez. */
export function situacoesDaCarteira(
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): Map<string, SituacaoCliente> {
  const grade = montarGrade(clients, frentes, acoes, now, ctx)
  const porCliente = new Map<string, StatusFrente[]>()
  for (const g of grade) {
    const lista = porCliente.get(g.clientId) ?? []
    lista.push(g)
    porCliente.set(g.clientId, lista)
  }
  const out = new Map<string, SituacaoCliente>()
  for (const c of clients) {
    if (!c.ativo) continue
    out.set(c.id, situacaoDaGrade(porCliente.get(c.id) ?? []))
  }
  return out
}

/** Avisos "perto do prazo" do cliente: não são alertas. */
export function avisosDoCliente(
  clientId: string,
  clients: readonly Client[],
  frentes: readonly Frente[],
  acoes: readonly Acao[],
  now: Date,
  ctx: ContextoRegras = {}
): StatusFrente[] {
  const alvo = clients.filter((c) => c.id === clientId)
  return montarGrade(alvo, frentes, acoes, now, ctx).filter(
    (g) => g.estado === "atencao"
  )
}

export const ESTADO_ORDEM: Record<EstadoFrente, number> = {
  critica: 3,
  atrasada: 2,
  atencao: 1,
  em_dia: 0,
}
