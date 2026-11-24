import "server-only"

import { buildSeed } from "../data/seed"
import type { Banco } from "./banco"
import { BancoMemoria } from "./banco-memoria"
import { modoDoBanco } from "./modo-banco"
import { bancoSupabase } from "./supabase-adapter"
import { getSupabase } from "./supabase"

/**
 * Banco em memória do modo de desenvolvimento. Fica em `globalThis` para
 * sobreviver ao hot reload e ser o mesmo em todos os route handlers.
 */
const global = globalThis as typeof globalThis & {
  __radarBancoMemoria?: Banco
  __radarAvisoModoBanco?: boolean
}

function avisar(mensagem: string) {
  if (global.__radarAvisoModoBanco) return
  global.__radarAvisoModoBanco = true
  console.warn(`[radar] ${mensagem}`)
}

/** Banco usado pelos route handlers (os testes substituem este módulo). */
export function getBanco(): Banco {
  const modo = modoDoBanco(process.env)
  if (modo !== "supabase") {
    avisar(
      `RADAR_DB=${process.env.RADAR_DB}: usando banco EM MEMÓRIA (só desenvolvimento; os dados somem ao reiniciar o servidor).`
    )
    global.__radarBancoMemoria ??=
      modo === "memoria" ? new BancoMemoria().semear(buildSeed()) : new BancoMemoria()
    return global.__radarBancoMemoria
  }
  if (process.env.NODE_ENV === "production" && process.env.RADAR_DB) {
    avisar("RADAR_DB é ignorado em produção; usando o Supabase.")
  }
  return bancoSupabase(getSupabase())
}
