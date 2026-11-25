import { rankOportunidade } from "./opportunities"
import type {
  Client,
  Frente,
  Opportunity,
  SituacaoCliente,
  StatusFrente,
} from "./types"

/**
 * Visões de carteira (funções puras): quantos clientes precisam de ação,
 * alertas agrupados por cliente e alertas por frente. Alimentam o painel
 * "Saúde da carteira", o Radar agrupado, a dock, o gráfico "Alertas por
 * frente" e a linha "Problemas" da Grade.
 */

export interface ResumoCarteira {
  total: number
  /** Crítico + Atenção: clientes com alguma coisa a resolver. */
  precisamAcao: number
  criticos: number
  atencao: number
  ok: number
}

/** Conta clientes por situação. Aceita `Map.values()` ou um array. */
export function resumoCarteira(
  situacoes: Iterable<SituacaoCliente>
): ResumoCarteira {
  let criticos = 0
  let atencao = 0
  let ok = 0
  for (const s of situacoes) {
    if (s === "critico") criticos++
    else if (s === "atencao") atencao++
    else ok++
  }
  return {
    total: criticos + atencao + ok,
    precisamAcao: criticos + atencao,
    criticos,
    atencao,
    ok,
  }
}

/**
 * Frase do painel "Saúde da carteira": "6 de 10 clientes precisam de ação";
 * com 0, "Nenhum cliente precisa de ação"; no singular, "1 de 3 clientes
 * precisa de ação".
 */
export function tituloCarteira(r: ResumoCarteira): string {
  if (r.precisamAcao === 0) return "Nenhum cliente precisa de ação"
  const verbo = r.precisamAcao === 1 ? "precisa" : "precisam"
  const clientes = r.total === 1 ? "cliente" : "clientes"
  return `${r.precisamAcao} de ${r.total} ${clientes} ${verbo} de ação`
}

/** "em 3 clientes" / "em 1 cliente" / "nenhum cliente" (apoio dos indicadores). */
export function emClientes(n: number): string {
  if (n === 0) return "nenhum cliente"
  return `em ${n} ${n === 1 ? "cliente" : "clientes"}`
}

const ORDEM_SITUACAO: Record<SituacaoCliente, number> = {
  critico: 2,
  atencao: 1,
  ok: 0,
}

export interface GrupoCliente {
  cliente: Client
  situacao: SituacaoCliente
  /** Alertas do cliente, do mais grave para o menos grave. */
  alertas: Opportunity[]
}

const diasOuMax = (o: Opportunity) =>
  o.diasParado === null ? Number.POSITIVE_INFINITY : o.diasParado

/**
 * Um grupo por cliente que tem alertas na lista dada (a lista já vem filtrada
 * por busca, aba e setor). Alertas do grupo: crítica, atrasada, aprovação
 * travada; empate = mais dias parado, depois a ordem de entrada. Grupos: pior
 * situação do cliente, mais alertas, nome (pt-BR). Clientes sem alerta na
 * lista não aparecem; situação ausente em `situacoes` = "ok".
 */
export function agruparPorCliente(
  oportunidades: readonly Opportunity[],
  clientes: readonly Client[],
  situacoes: ReadonlyMap<string, SituacaoCliente>
): GrupoCliente[] {
  const porCliente = new Map<string, Client>(clientes.map((c) => [c.id, c]))
  const mapa = new Map<string, Opportunity[]>()
  for (const o of oportunidades) {
    if (!porCliente.has(o.clientId)) continue
    const lista = mapa.get(o.clientId) ?? []
    lista.push(o)
    mapa.set(o.clientId, lista)
  }
  const grupos: GrupoCliente[] = []
  for (const [id, lista] of mapa) {
    const alertas = lista
      .map((o, i) => ({ o, i }))
      .sort(
        (a, b) =>
          rankOportunidade(b.o) - rankOportunidade(a.o) ||
          (diasOuMax(b.o) === diasOuMax(a.o)
            ? 0
            : diasOuMax(b.o) > diasOuMax(a.o)
              ? 1
              : -1) ||
          a.i - b.i
      )
      .map((x) => x.o)
    grupos.push({
      cliente: porCliente.get(id)!,
      situacao: situacoes.get(id) ?? "ok",
      alertas,
    })
  }
  return grupos.sort(
    (a, b) =>
      ORDEM_SITUACAO[b.situacao] - ORDEM_SITUACAO[a.situacao] ||
      b.alertas.length - a.alertas.length ||
      a.cliente.nome.localeCompare(b.cliente.nome, "pt-BR")
  )
}

/** Quantos alertas cada cliente tem (para o aviso "mais N alertas" no cartão). */
export function alertasPorCliente(
  oportunidades: readonly Opportunity[]
): Map<string, number> {
  const out = new Map<string, number>()
  for (const o of oportunidades) {
    out.set(o.clientId, (out.get(o.clientId) ?? 0) + 1)
  }
  return out
}

export interface AlertasDaFrente {
  frente: Frente
  criticas: number
  atrasadas: number
  /** atrasadas + críticas (o número da linha "Problemas" da Grade). */
  total: number
}

/**
 * Pares atrasados ou críticos por frente: é a MESMA conta da linha
 * "Problemas" da Grade, que usa esta função. Aprovação travada não entra.
 * Ordem: total (maior primeiro), depois críticas, depois a ordem de `frentes`;
 * frentes com 0 ficam ao fim. Inclui todas as frentes dadas.
 */
export function alertasPorFrente(
  grade: readonly StatusFrente[],
  frentes: readonly Frente[]
): AlertasDaFrente[] {
  const criticas = new Map<string, number>()
  const atrasadas = new Map<string, number>()
  for (const s of grade) {
    if (s.estado === "critica") {
      criticas.set(s.frenteId, (criticas.get(s.frenteId) ?? 0) + 1)
    } else if (s.estado === "atrasada") {
      atrasadas.set(s.frenteId, (atrasadas.get(s.frenteId) ?? 0) + 1)
    }
  }
  return frentes
    .map((frente, i) => {
      const c = criticas.get(frente.id) ?? 0
      const a = atrasadas.get(frente.id) ?? 0
      return { frente, criticas: c, atrasadas: a, total: c + a, i }
    })
    .sort((x, y) => y.total - x.total || y.criticas - x.criticas || x.i - y.i)
    .map(({ frente, criticas: c, atrasadas: a, total }) => ({
      frente,
      criticas: c,
      atrasadas: a,
      total,
    }))
}
