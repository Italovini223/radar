import type { RadarSnapshot } from "../domain/types"

/**
 * Interface de repositório: o app só conversa com isto. Na Sprint 2 basta
 * trocar `localStorageRepository` por uma implementação Supabase (mesmos
 * métodos, já assíncronos) sem tocar em telas ou regras.
 */
export interface RadarRepository {
  load(): Promise<RadarSnapshot | null>
  save(snapshot: RadarSnapshot): Promise<void>
  clear(): Promise<void>
}

export const STORAGE_KEY = "weethub-radar:v1"

export function isSnapshot(valor: unknown): valor is RadarSnapshot {
  if (!valor || typeof valor !== "object") return false
  const v = valor as Record<string, unknown>
  return (
    Array.isArray(v.clients) &&
    Array.isArray(v.frentes) &&
    Array.isArray(v.acoes) &&
    Array.isArray(v.checkups) &&
    Array.isArray(v.atribuicoes)
  )
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

export const localStorageRepository: RadarRepository = {
  async load() {
    const s = storage()
    if (!s) return null
    const bruto = s.getItem(STORAGE_KEY)
    if (!bruto) return null
    const parsed: unknown = JSON.parse(bruto)
    if (!isSnapshot(parsed)) {
      throw new Error("Os dados salvos no navegador estão em formato inválido.")
    }
    return parsed
  },
  async save(snapshot) {
    const s = storage()
    if (!s) return
    s.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  },
  async clear() {
    storage()?.removeItem(STORAGE_KEY)
  },
}
