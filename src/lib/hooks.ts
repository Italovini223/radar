"use client"

import { useMemo } from "react"

import {
  calcularMetricas,
  derivarOportunidades,
} from "./domain/opportunities"
import { contextoDoSnapshot, montarGrade } from "./domain/rules"
import { useRadarStore } from "./store"

/**
 * Visão derivada do store: tudo que as telas mostram (grade, oportunidades,
 * métricas) é calculado aqui pelas regras puras. Nada é guardado.
 */
export function useRadar() {
  const ready = useRadarStore((s) => s.ready)
  const erro = useRadarStore((s) => s.erro)
  const vazio = useRadarStore((s) => s.vazio)
  const agora = useRadarStore((s) => s.agora)
  const clients = useRadarStore((s) => s.clients)
  const frentes = useRadarStore((s) => s.frentes)
  const acoes = useRadarStore((s) => s.acoes)
  const checkups = useRadarStore((s) => s.checkups)
  const atribuicoes = useRadarStore((s) => s.atribuicoes)
  const contratos = useRadarStore((s) => s.contratos)
  const configuracao = useRadarStore((s) => s.configuracao)

  const hoje = useMemo(() => new Date(agora || 0), [agora])

  const derivado = useMemo(() => {
    if (!ready || !agora) {
      return { grade: [], oportunidades: [], metricas: null }
    }
    const ctx = contextoDoSnapshot({ contratos, configuracao })
    return {
      grade: montarGrade(clients, frentes, acoes, hoje, ctx),
      oportunidades: derivarOportunidades(clients, frentes, acoes, hoje, ctx),
      metricas: calcularMetricas(clients, frentes, acoes, hoje, ctx),
    }
  }, [ready, agora, clients, frentes, acoes, contratos, configuracao, hoje])

  return {
    ready: ready && agora > 0,
    erro,
    vazio,
    hoje,
    clients,
    frentes,
    acoes,
    checkups,
    atribuicoes,
    contratos,
    configuracao,
    ...derivado,
  }
}
