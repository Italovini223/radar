import { ESTADOS, EstadoGlyph } from "@/components/radar/estado"
import type { EstadoFrente } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

const ORDEM: EstadoFrente[] = ["em_dia", "atencao", "atrasada", "critica"]

/**
 * Legenda dos 4 estados numa linha só. Cada item repete o visual da célula:
 * "Em dia" é só texto cinza; os demais têm glifo, texto e fundo do estado.
 */
export function Legend() {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
      aria-label="Legenda dos estados"
    >
      {ORDEM.map((e) => {
        const { classe, label } = ESTADOS[e]
        return (
          <li key={e}>
            {e === "em_dia" ? (
              <span className="tnum px-1 text-muted-foreground">
                {label} (5 d)
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold",
                  classe
                )}
              >
                <EstadoGlyph estado={e} className="size-3" />
                {label}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
