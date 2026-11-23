import { getBanco } from "@/lib/server/banco-instancia"
import { executar, lerCorpo, ok, validar } from "@/lib/server/http"
import { atualizarFrente } from "@/lib/server/radar-db"
import { frenteSchema, idRotaSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** PUT /api/radar/frentes/[id]: prazo e/ou "vira crítico após". */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return executar(async () => {
    const id = validar(idRotaSchema, (await params).id)
    const campos = await lerCorpo(req, frenteSchema)
    return ok(await atualizarFrente(getBanco(), id, campos))
  })
}
