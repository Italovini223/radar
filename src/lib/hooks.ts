"use client"

import { useMemo } from "react"

import {
  calcularMetricas,
  derivarOportunidades,
} from "./domain/opportunities"
import { montarGrade } from "./domain/rules"
import { useRadarStore } from "./store"

/**
 * Visão derivada do store: tudo que as telas mostram (grade, oportunidades,
 * métricas) é calculado aqui pelas regras puras. Nada é guardado.
 */
export function useRadar() {
  const ready = useRadarStore((s) => s.ready)
  const erro = useRadarStore((s) => s.erro)
  const agora = useRadarStore((s) => s.agora)
  const clients = useRadarStore((s) => s.clients)
  const frentes = useRadarStore((s) => s.frentes)
  const acoes = useRadarStore((s) => s.acoes)
  const checkups = useRadarStore((s) => s.checkups)
  const atribuicoes = useRadarStore((s) => s.atribuicoes)

  const hoje = useMemo(() => new Date(agora || 0), [agora])

  const derivado = useMemo(() => {
    if (!ready || !agora) {
      return { grade: [], oportunidades: [], metricas: null }
    }
    return {
      grade: montarGrade(clients, frentes, acoes, hoje),
      oportunidades: derivarOportunidades(clients, frentes, acoes, hoje),
      metricas: calcularMetricas(clients, frentes, acoes, hoje),
    }
  }, [ready, agora, clients, frentes, acoes, hoje])

  return {
    ready: ready && agora > 0,
    erro,
    hoje,
    clients,
    frentes,
    acoes,
    checkups,
    atribuicoes,
    ...derivado,
  }
}
