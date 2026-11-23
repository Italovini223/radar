import { getBanco } from "@/lib/server/banco-instancia"
import { executar, lerCorpo, ok } from "@/lib/server/http"
import { registrarAcao } from "@/lib/server/radar-db"
import { novaAcaoSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** POST /api/radar/acoes: registra uma ação. */
export async function POST(req: Request) {
  return executar(async () => {
    const entrada = await lerCorpo(req, novaAcaoSchema)
    return ok(await registrarAcao(getBanco(), entrada), 201)
  })
}
