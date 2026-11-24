import { getBanco } from "@/lib/server/banco-instancia"
import { executar, lerCorpo, ok } from "@/lib/server/http"
import { salvarCheckup } from "@/lib/server/radar-db"
import { checkupSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** POST /api/radar/checkups: salva um check-up e corrige o histórico das frentes. */
export async function POST(req: Request) {
  return executar(async () => {
    const entrada = await lerCorpo(req, checkupSchema)
    return ok(await salvarCheckup(getBanco(), entrada), 201)
  })
}
