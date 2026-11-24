import { ESTADOS, EstadoGlyph } from "@/components/radar/estado"
import type { EstadoFrente } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

const ORDEM: EstadoFrente[] = ["critica", "atrasada", "atencao", "em_dia"]

/**
 * Legenda dos 4 estados numa linha só, no formato de status: marcador +
 * texto colorido, sem fundo. Triângulo = estourou o prazo; bolinha = não.
 */
export function Legend() {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-xs font-medium"
      aria-label="Legenda dos estados"
    >
      {ORDEM.map((e) => {
        const { texto, label } = ESTADOS[e]
        return (
          <li key={e} className={cn("inline-flex items-center gap-1.5", texto)}>
            <EstadoGlyph estado={e} />
            {label}
          </li>
        )
      })}
    </ul>
  )
}
