import { getBanco } from "@/lib/server/banco-instancia"
import { executar, LIMITE_CORPO_IMPORTAR, lerCorpo, ok } from "@/lib/server/http"
import { importarDataset } from "@/lib/server/radar-db"
import { datasetSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"

/** POST /api/radar/importar: substitui o conteúdo de demonstração por um dataset. */
export async function POST(req: Request) {
  return executar(async () => {
    const dataset = await lerCorpo(req, datasetSchema, LIMITE_CORPO_IMPORTAR)
    return ok(await importarDataset(getBanco(), dataset))
  })
}
