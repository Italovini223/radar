import Link from "next/link"

import { ESTADOS, EstadoGlyph } from "@/components/radar/estado"
import { formatarDias } from "@/lib/domain/opportunities"
import type { Client, Frente, StatusFrente } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

/**
 * Célula da grade. "Em dia" é só "5 d" em cinza (sem glifo nem fundo): o olho
 * vai direto ao que pede ação. Os demais estados trazem glifo + texto, com a
 * cor só reforçando. Clique leva à ficha do cliente com a frente em destaque.
 */
export function FrenteCell({
  status,
  cliente,
  frente,
}: {
  status: StatusFrente
  cliente: Client
  frente: Frente
}) {
  const { classe, label } = ESTADOS[status.estado]
  const quieto = status.estado === "em_dia" && !status.nunca
  const valor = status.nunca ? "Nunca" : formatarDias(status.dias ?? 0)
  const rotuloEstado = status.nunca ? "Nunca teve ação" : label

  return (
    <Link
      href={`/clientes/${cliente.id}?frente=${frente.id}`}
      data-celula={`${cliente.id}:${frente.id}`}
      data-estado={`${status.estado}${status.nunca ? "n" : ""}`}
      aria-label={`${cliente.nome}, ${frente.nome}: ${rotuloEstado}${
        status.nunca ? "" : `, ${valor} desde a última ação (prazo ${frente.prazoDias} dias)`
      }${status.travada ? ", com aprovação travada" : ""}. Abrir ficha do cliente.`}
      className={cn(
        "relative flex flex-col justify-center overflow-hidden rounded-md border px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        quieto
          ? "min-h-10 border-transparent bg-transparent text-muted-foreground hover:bg-secondary"
          : cn("min-h-14 gap-1 py-2", classe, "hover:brightness-95")
      )}
    >
      {quieto ? (
        <span className="tnum text-sm leading-none">{status.dias} d</span>
      ) : (
        <>
          <span className="tnum flex items-center gap-1.5 text-[0.9rem] leading-none font-bold">
            <EstadoGlyph
              estado={status.estado}
              nunca={status.nunca}
              className="size-3"
            />
            {valor}
          </span>
          <span className="text-xs leading-none font-medium">
            {status.nunca ? "Sem ação" : label}
          </span>
        </>
      )}
      <span
        aria-hidden
        data-flash
        className="pointer-events-none absolute inset-0 bg-foreground opacity-0"
      />
      {status.travada ? (
        <span
          className="absolute top-0 right-0 size-0 border-t-[12px] border-l-[12px] border-t-state-warn border-l-transparent"
          title="Aprovação travada"
        >
          <span className="sr-only">Aprovação travada</span>
        </span>
      ) : null}
    </Link>
  )
}
