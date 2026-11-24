import { getBanco } from "@/lib/server/banco-instancia"
import { executar, lerCorpo, ok } from "@/lib/server/http"
import { atribuir } from "@/lib/server/radar-db"
import { atribuicaoSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** POST /api/radar/atribuicoes: atribui (ou reatribui) uma oportunidade a um setor. */
export async function POST(req: Request) {
  return executar(async () => {
    const entrada = await lerCorpo(req, atribuicaoSchema)
    return ok(await atribuir(getBanco(), entrada), 201)
  })
}
