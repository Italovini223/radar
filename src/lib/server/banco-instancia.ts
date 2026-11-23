import "server-only"

import type { Banco } from "./banco"
import { bancoSupabase } from "./supabase-adapter"
import { getSupabase } from "./supabase"

/** Banco usado pelos route handlers (os testes substituem este módulo). */
export function getBanco(): Banco {
  return bancoSupabase(getSupabase())
}
