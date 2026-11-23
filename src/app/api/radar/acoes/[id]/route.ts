import { getBanco } from "@/lib/server/banco-instancia"
import { executar, lerCorpo, ok, validar } from "@/lib/server/http"
import { atualizarStatusAcao } from "@/lib/server/radar-db"
import { idRotaSchema, statusAcaoSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** PATCH /api/radar/acoes/[id]: muda o status de uma ação. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return executar(async () => {
    const id = validar(idRotaSchema, (await params).id)
    const { status } = await lerCorpo(req, statusAcaoSchema)
    return ok(await atualizarStatusAcao(getBanco(), id, status))
  })
}
