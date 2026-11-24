import { getBanco } from "@/lib/server/banco-instancia"
import { executar, lerCorpo, ok } from "@/lib/server/http"
import { atualizarConfiguracao } from "@/lib/server/radar-db"
import { configuracaoParcialSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** PUT /api/radar/configuracao: limites e data de referência. */
export async function PUT(req: Request) {
  return executar(async () => {
    const parcial = await lerCorpo(req, configuracaoParcialSchema)
    return ok(await atualizarConfiguracao(getBanco(), parcial))
  })
}
