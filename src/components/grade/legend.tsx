import { ESTADOS, EstadoGlyph } from "@/components/radar/estado"
import type { EstadoFrente } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

const ORDEM: EstadoFrente[] = ["critica", "atrasada", "atencao", "em_dia"]

/**
 * Legenda da Grade: como ler uma célula. Linha 1: os 4 estados, no formato de
 * status (marcador + texto colorido; triângulo = estourou o prazo, bolinha =
 * não). Linha 2: o que cada leitura significa. O rodapé da Grade explica só
 * "Problemas" e o clique, para não repetir.
 */
export function Legend({ limiteAprovacaoDias }: { limiteAprovacaoDias: number }) {
  return (
    <div aria-label="Legenda da grade" role="group" className="flex flex-col gap-2">
      <ul
        className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-xs font-medium"
        aria-label="Estados"
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
      <ul
        className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-xs text-muted-foreground"
        aria-label="Como ler a célula"
      >
        <li>
          <b className="tnum font-medium text-foreground">Em dia</b> mostra só
          os dias, ex. 5 dias
        </li>
        <li>
          <b className="font-medium text-foreground">Nunca</b> = nenhuma ação
          registrada
        </li>
        <li>
          <b className="font-medium text-foreground">sem histórico</b> = CRO sem
          nenhuma ação (só informativo, não é alerta)
        </li>
        <li className="inline-flex items-center gap-1.5">
          <b aria-hidden className="font-medium text-foreground">
            —
          </b>
          <span>
            <span className="sr-only">Traço: </span>frente não contratada
          </span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-0 border-t-[10px] border-l-[10px] border-t-state-warn-bar border-l-transparent"
          />
          <span>
            canto marcado = aprovação travada (mais de {limiteAprovacaoDias}{" "}
            dias)
          </span>
        </li>
      </ul>
    </div>
  )
}
