import { getBanco } from "@/lib/server/banco-instancia"
import { executar, ok } from "@/lib/server/http"
import { resetar } from "@/lib/server/radar-db"

export const dynamic = "force-dynamic"

/** POST /api/radar/resetar: reimporta a fixture de demonstração. */
export async function POST() {
  return executar(async () => ok(await resetar(getBanco())))
}
