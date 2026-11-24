import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

import type { Acao, EstadoFrente, StatusAcao, StatusFrente } from "./types"

/**
 * Pessoas do Radar. Não há cadastro de pessoas: quem trabalha num cliente é
 * derivado de `Acao.responsavel`, que vem como "Área · Nome" ("Tráfego ·
 * Marina") ou só como um nome, quando registrado à mão.
 */
export interface Pessoa {
  /** Chave estável: o nome normalizado (sem acento, minúsculo). */
  id: string
  nome: string
  area?: string
}

const SEPARADOR = /\s+[·•|-]\s+/

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
}

/** "Tráfego · Marina" -> { nome: "Marina", area: "Tráfego" }. Vazio -> null. */
export function pessoaDe(responsavel?: string | null): Pessoa | null {
  const texto = responsavel?.trim()
  if (!texto) return null
  const partes = texto.split(SEPARADOR).map((p) => p.trim()).filter(Boolean)
  const nome = partes.length > 1 ? partes[partes.length - 1] : partes[0]
  const area = partes.length > 1 ? partes.slice(0, -1).join(" · ") : undefined
  return { id: normalizar(nome), nome, ...(area ? { area } : {}) }
}

/** Até duas iniciais: "Marina" -> "MA"; "Ana Clara" -> "AC". */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return "?"
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase()
  return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase()
}

const doCliente = (acoes: Acao[], clientId: string) =>
  acoes.filter((a) => a.clientId === clientId)

const maisRecentePrimeiro = (a: Acao, b: Acao) =>
  b.data.localeCompare(a.data) || b.id.localeCompare(a.id)

/**
 * Pessoas que atuaram em cada frente do cliente, sem repetição, da que atuou
 * por último para a primeira.
 */
export function pessoasPorFrente(
  acoes: Acao[],
  clientId: string
): Map<string, Pessoa[]> {
  const mapa = new Map<string, Pessoa[]>()
  for (const a of doCliente(acoes, clientId).sort(maisRecentePrimeiro)) {
    const p = pessoaDe(a.responsavel)
    if (!p) continue
    const lista = mapa.get(a.frenteId) ?? []
    if (!lista.some((x) => x.id === p.id)) lista.push(p)
    mapa.set(a.frenteId, lista)
  }
  return mapa
}

export interface DemandaAtrasada {
  frenteId: string
  estado: EstadoFrente
  nunca: boolean
  dias: number | null
  /** A pessoa foi quem atuou por último nessa frente. */
  ultimaAAtuar: boolean
}

export interface PessoaEmAtraso {
  pessoa: Pessoa
  demandas: DemandaAtrasada[]
  /** Ações dessa pessoa neste cliente (todas as frentes). */
  totalAcoes: number
  /** Data da última ação dela neste cliente. */
  ultimaAcao: string
}

const PESO: Record<EstadoFrente, number> = {
  critica: 3,
  atrasada: 2,
  atencao: 1,
  em_dia: 0,
}

/**
 * Quem está atrelado às frentes atrasadas ou críticas do cliente: toda pessoa
 * que já registrou ação numa dessas frentes. Ordem: quem tem mais demandas
 * críticas, depois mais demandas, depois nome.
 */
export function pessoasEmAtraso(
  linhas: StatusFrente[],
  acoes: Acao[],
  clientId: string
): PessoaEmAtraso[] {
  const atrasadas = linhas.filter(
    (l) => l.clientId === clientId && (l.estado === "atrasada" || l.estado === "critica")
  )
  if (atrasadas.length === 0) return []

  const doCli = doCliente(acoes, clientId).sort(maisRecentePrimeiro)
  const porPessoa = new Map<string, PessoaEmAtraso>()

  for (const a of doCli) {
    const p = pessoaDe(a.responsavel)
    if (!p) continue
    const atual = porPessoa.get(p.id)
    if (atual) atual.totalAcoes += 1
    else porPessoa.set(p.id, { pessoa: p, demandas: [], totalAcoes: 1, ultimaAcao: a.data })
  }

  for (const l of atrasadas) {
    const naFrente = doCli.filter((a) => a.frenteId === l.frenteId)
    const ultima = naFrente.map((a) => pessoaDe(a.responsavel)).find(Boolean)
    const vistas = new Set<string>()
    for (const a of naFrente) {
      const p = pessoaDe(a.responsavel)
      if (!p || vistas.has(p.id)) continue
      vistas.add(p.id)
      porPessoa.get(p.id)?.demandas.push({
        frenteId: l.frenteId,
        estado: l.estado,
        nunca: l.nunca,
        dias: l.dias,
        ultimaAAtuar: ultima?.id === p.id,
      })
    }
  }

  const gravidade = (x: PessoaEmAtraso) =>
    x.demandas.reduce((s, d) => s + PESO[d.estado], 0)

  return [...porPessoa.values()]
    .filter((x) => x.demandas.length > 0)
    .map((x) => ({
      ...x,
      demandas: [...x.demandas].sort(
        (a, b) => PESO[b.estado] - PESO[a.estado] || (b.dias ?? Infinity) - (a.dias ?? Infinity)
      ),
    }))
    .sort(
      (a, b) =>
        gravidade(b) - gravidade(a) ||
        b.demandas.length - a.demandas.length ||
        a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR")
    )
}

/* ---------- Painel do cliente (dados dos gráficos) ---------- */

/** % das frentes contratadas que não estão atrasadas nem críticas (0 a 100). */
export function saudeDoCliente(linhas: StatusFrente[]): number {
  if (linhas.length === 0) return 100
  const ok = linhas.filter((l) => l.estado === "em_dia" || l.estado === "atencao").length
  return Math.round((ok / linhas.length) * 100)
}

export function acoesPorStatus(
  acoes: Acao[],
  clientId: string
): Record<StatusAcao, number> {
  const r: Record<StatusAcao, number> = {
    concluida: 0,
    em_andamento: 0,
    aguardando_aprovacao: 0,
  }
  for (const a of doCliente(acoes, clientId)) r[a.status] += 1
  return r
}

export interface Semana {
  /** Primeiro dia da semana (ISO). */
  inicio: string
  rotulo: string
  acoes: number
}

/**
 * Ações por semana nas últimas `semanas` semanas, terminando na semana de
 * `hoje` (janelas de 7 dias contadas para trás a partir de hoje).
 */
export function atividadeSemanal(
  acoes: Acao[],
  clientId: string,
  hoje: Date,
  semanas = 12
): Semana[] {
  const fim = startOfDay(hoje)
  const inicioJanela = addDays(fim, -(semanas * 7 - 1))
  const serie: Semana[] = Array.from({ length: semanas }, (_, i) => {
    const inicio = addDays(inicioJanela, i * 7)
    return {
      inicio: format(inicio, "yyyy-MM-dd"),
      rotulo: format(inicio, "d MMM", { locale: ptBR }),
      acoes: 0,
    }
  })
  for (const a of doCliente(acoes, clientId)) {
    const d = differenceInCalendarDays(parseISO(a.data), inicioJanela)
    if (d < 0 || d >= semanas * 7) continue
    serie[Math.floor(d / 7)].acoes += 1
  }
  return serie
}

export interface UsoPrazo {
  frenteId: string
  estado: EstadoFrente
  nunca: boolean
  dias: number | null
  prazoDias: number
  /** dias / prazo, limitado a 2 (2× o prazo). "Nunca" conta como 2. */
  uso: number
}

export function usoDoPrazo(linhas: StatusFrente[]): UsoPrazo[] {
  return linhas.map((l) => ({
    frenteId: l.frenteId,
    estado: l.estado,
    nunca: l.nunca,
    dias: l.dias,
    prazoDias: l.prazoDias,
    uso:
      l.nunca || l.dias === null
        ? 2
        : Math.min(2, l.prazoDias > 0 ? l.dias / l.prazoDias : 0),
  }))
}

export interface AcoesDaPessoa {
  pessoa: Pessoa
  concluidas: number
  abertas: number
}

/** Ações por pessoa no cliente (concluídas e abertas), de quem fez mais para menos. */
export function acoesPorPessoa(acoes: Acao[], clientId: string): AcoesDaPessoa[] {
  const mapa = new Map<string, AcoesDaPessoa>()
  for (const a of doCliente(acoes, clientId)) {
    const p = pessoaDe(a.responsavel)
    if (!p) continue
    const x = mapa.get(p.id) ?? { pessoa: p, concluidas: 0, abertas: 0 }
    if (a.status === "concluida") x.concluidas += 1
    else x.abertas += 1
    mapa.set(p.id, x)
  }
  return [...mapa.values()].sort(
    (a, b) =>
      b.concluidas + b.abertas - (a.concluidas + a.abertas) ||
      a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR")
  )
}
