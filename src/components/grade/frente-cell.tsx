import Link from "next/link"

import { ESTADOS, EstadoGlyph } from "@/components/radar/estado"
import { Dica } from "@/components/ui/dica"
import { formatarDias } from "@/lib/domain/opportunities"
import type { Client, Frente, StatusFrente } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

/** A partir daqui a barrinha de uso do prazo fica amarela. */
const LIMITE_AMARELO = 0.7

/**
 * Célula da grade. Sem fundo colorido: o número muda de cor e ganha marcador
 * só quando há alerta (atenção, atrasada, crítica). Embaixo dos números que
 * ainda não estouraram o prazo, uma barrinha de 44px mostra quanto do prazo
 * já foi usado; acima de 70% ela fica amarela. Clique leva à ficha do
 * cliente com a frente em destaque.
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
  const { texto, label } = ESTADOS[status.estado]
  const alerta = status.nunca || status.estado !== "em_dia"
  const estourou =
    status.nunca || status.estado === "atrasada" || status.estado === "critica"
  const valor = status.nunca ? "nunca" : formatarDias(status.dias ?? 0)
  const rotuloEstado = status.nunca ? "Nunca teve ação" : label
  const uso =
    status.nunca || frente.prazoDias <= 0
      ? 0
      : Math.min(1, (status.dias ?? 0) / frente.prazoDias)

  const dica = (
    <>
      <b className="font-medium">
        {cliente.nome} · {frente.nome}
      </b>
      <br />
      {rotuloEstado}
      {status.nunca ? "" : `: ${valor} desde a última ação (prazo ${frente.prazoDias} d)`}
      {status.travada ? " · aprovação travada" : ""}
      <br />
      Clique para abrir a ficha com esta frente em destaque.
    </>
  )

  return (
    <Dica texto={dica}>
    <Link
      href={`/clientes/${cliente.id}?frente=${frente.id}`}
      data-celula={`${cliente.id}:${frente.id}`}
      data-estado={`${status.estado}${status.nunca ? "n" : ""}`}
      aria-label={`${cliente.nome}, ${frente.nome}: ${rotuloEstado}${
        status.nunca ? "" : `, ${valor} desde a última ação (prazo ${frente.prazoDias} dias)`
      }${status.travada ? ", com aprovação travada" : ""}. Abrir ficha do cliente.`}
      className={cn(
        "relative flex min-h-11 flex-col justify-center overflow-hidden rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-panel-hi focus-visible:outline-2 focus-visible:outline-ring",
        alerta
          ? cn(status.nunca ? ESTADOS.critica.texto : texto, "font-medium")
          : "text-muted-foreground"
      )}
    >
      <span className="tnum inline-flex items-center gap-1.5 leading-none whitespace-nowrap">
        {alerta ? (
          <EstadoGlyph estado={status.estado} nunca={status.nunca} />
        ) : null}
        {valor}
      </span>
      {estourou ? null : (
        <span
          aria-hidden
          className="mt-1 block h-0.5 w-11 overflow-hidden rounded-full bg-line"
        >
          <span
            className={cn(
              "block h-full rounded-full",
              uso > LIMITE_AMARELO ? "bg-state-warn-bar" : "bg-ink-3"
            )}
            style={{ width: `${Math.round(uso * 100)}%` }}
          />
        </span>
      )}
      <span
        aria-hidden
        data-flash
        className="pointer-events-none absolute inset-0 bg-foreground opacity-0"
      />
      {status.travada ? (
        <span className="absolute top-0 right-0 size-0 border-t-[10px] border-l-[10px] border-t-state-warn-bar border-l-transparent">
          <span className="sr-only">Aprovação travada</span>
        </span>
      ) : null}
    </Link>
    </Dica>
  )
}
