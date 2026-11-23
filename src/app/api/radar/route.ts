import { getBanco } from "@/lib/server/banco-instancia"
import { executar, ok } from "@/lib/server/http"
import { carregarSnapshot } from "@/lib/server/radar-db"

// Dados do banco: nunca cachear.
export const dynamic = "force-dynamic"

/** GET /api/radar: snapshot completo. */
export async function GET() {
  return executar(async () => ok(await carregarSnapshot(getBanco())))
}
