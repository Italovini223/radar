"use client"

import { create } from "zustand"

import { derivarOportunidades } from "./domain/opportunities"
import { resumoPosAcao, type ResumoPosAcao } from "./domain/pos-acao"
import { contextoDoSnapshot } from "./domain/rules"
import type { Opportunity, StatusAcao } from "./domain/types"
import { useRadarStore, type RadarState } from "./store"

/**
 * Confirmação inline persistente depois de registrar uma ação ou um check-up:
 * fica na tela até ser dispensada ou substituída por outra.
 */
interface ConfirmacaoState {
  resumo: ResumoPosAcao | null
  /** Identifica a confirmação atual (para desfazê-la se o servidor recusar). */
  numero: number
  mostrar: (r: ResumoPosAcao) => number
  fechar: (numero?: number) => void
}

export const useConfirmacaoStore = create<ConfirmacaoState>()((set, get) => ({
  resumo: null,
  numero: 0,
  mostrar: (resumo) => {
    const numero = get().numero + 1
    set({ resumo, numero })
    return numero
  },
  fechar: (numero) => {
    if (numero !== undefined && numero !== get().numero) return
    set({ resumo: null })
  },
}))

export function oportunidadesDoEstado(
  s: Pick<
    RadarState,
    "clients" | "frentes" | "acoes" | "contratos" | "configuracao" | "agora"
  >
): Opportunity[] {
  return derivarOportunidades(
    s.clients,
    s.frentes,
    s.acoes,
    new Date(s.agora),
    contextoDoSnapshot(s)
  )
}

/**
 * Registra a ação (otimista) e publica o resumo "antes x depois". Se o
 * servidor recusar, a store reverte a ação e a confirmação some junto.
 */
export async function registrarAcaoComResumo(entrada: {
  clientId: string
  frenteId: string
  titulo: string
  data: string
  status: StatusAcao
}): Promise<boolean> {
  const loja = useRadarStore.getState()
  const antes = oportunidadesDoEstado(loja)
  const promessa = loja.registrarAcao(entrada)
  // `registrarAcao` aplica a mudança de forma síncrona (otimista).
  const depois = oportunidadesDoEstado(useRadarStore.getState())
  const numero = useConfirmacaoStore.getState().mostrar(
    resumoPosAcao({
      clientId: entrada.clientId,
      frenteIds: [entrada.frenteId],
      status: entrada.status,
      antes,
      depois,
    })
  )
  const ok = await promessa
  if (!ok) useConfirmacaoStore.getState().fechar(numero)
  return ok
}

/** Salva o check-up e, se alguma frente mudou, publica o resumo. */
export function salvarCheckupComResumo(entrada: {
  clientId: string
  entradas: { frenteId: string; data: string }[]
  resultadoAds?: "estavel" | "caindo" | "subindo"
}): string[] {
  const antes = oportunidadesDoEstado(useRadarStore.getState())
  const alteradas = useRadarStore.getState().salvarCheckup(entrada)
  if (alteradas.length > 0) {
    const depois = oportunidadesDoEstado(useRadarStore.getState())
    useConfirmacaoStore.getState().mostrar(
      resumoPosAcao({
        clientId: entrada.clientId,
        frenteIds: alteradas,
        status: "concluida",
        antes,
        depois,
      })
    )
  }
  return alteradas
}
