"use client"

import Link from "next/link"

import { EstadoBadge } from "@/components/radar/estado"
import { Button } from "@/components/ui/button"
import { impactoDaOportunidade } from "@/lib/ai/proposal"
import { formatarDias } from "@/lib/domain/opportunities"
import { useRadarStore } from "@/lib/store"
import type {
  Atribuicao,
  Client,
  Frente,
  Opportunity,
} from "@/lib/domain/types"

interface Props {
  oportunidade: Opportunity
  cliente: Client
  frente: Frente
  atribuicao?: Atribuicao
  tituloAcao?: string
  onVerProposta: (o: Opportunity) => void
}

/** Ponto amarelo de 6px: oportunidade nova (venceu o prazo há até 14 dias). */
function PontoNova() {
  return (
    <>
      <span
        aria-hidden
        title="Nova: o prazo venceu há até 14 dias"
        className="size-1.5 shrink-0 rounded-full bg-brand"
      />
      <span className="sr-only">Nova. </span>
    </>
  )
}

function Metadados({
  o,
  cliente,
  atribuicao,
}: {
  o: Opportunity
  cliente: Client
  atribuicao?: Atribuicao
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {o.setorResponsavel} · {cliente.responsavel}
      {atribuicao ? (
        <span className="font-semibold text-state-ok">
          {" "}
          · Atribuída a {atribuicao.setor}
        </span>
      ) : null}
    </p>
  )
}

/**
 * Crítica: cartão cheio, com o número grande e "Ver proposta" como ação
 * primária (preto).
 */
export function OportunidadeCheia({
  oportunidade: o,
  cliente,
  frente,
  atribuicao,
  tituloAcao,
  onVerProposta,
}: Props) {
  const impacto = impactoDaOportunidade({
    oportunidade: o,
    clienteNome: cliente.nome,
    frenteNome: frente.nome,
    setor: frente.setor,
    tituloAcao,
  })
  return (
    <li data-flip-id={o.id}>
      <article
        className="rounded-lg border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover"
        aria-labelledby={`opp-${o.id}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {o.nova ? <PontoNova /> : null}
              <h3 id={`opp-${o.id}`} className="text-lg leading-tight font-bold">
                <Link
                  href={`/clientes/${cliente.id}?frente=${frente.id}`}
                  className="hover:text-link"
                >
                  {cliente.nome}
                </Link>
              </h3>
              <EstadoBadge estado={o.estado} nunca={o.nunca} />
            </div>
            <p className="mt-2 text-base font-medium">{o.motivo}</p>
            <p className="mt-1 text-sm text-muted-foreground">{impacto}</p>
            <div className="mt-3">
              <Metadados o={o} cliente={cliente} atribuicao={atribuicao} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-1 border-t pt-4 sm:min-w-40 sm:items-end sm:border-t-0 sm:pt-0">
            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Parado há
            </span>
            <span className="tnum text-[1.75rem] leading-none font-extrabold text-state-crit">
              {o.diasParado === null ? "Nunca" : formatarDias(o.diasParado)}
            </span>
            <span className="tnum text-sm text-muted-foreground">
              prazo: {o.prazoDias} dias
            </span>
            <Button
              className="mt-3 w-fit"
              onClick={() => onVerProposta(o)}
              aria-label={`Ver proposta para ${cliente.nome}, ${frente.nome}`}
            >
              Ver proposta
            </Button>
          </div>
        </div>
      </article>
    </li>
  )
}

/**
 * Atrasada ou travada em aprovação: linha compacta, tipo tabela, com ação
 * secundária (contorno).
 */
export function OportunidadeLinha({
  oportunidade: o,
  cliente,
  frente,
  atribuicao,
  onVerProposta,
}: Props) {
  const aprovacao = o.tipo === "aprovacao"
  const limiteAprovacao = useRadarStore((s) => s.configuracao.limiteAprovacaoDias)
  return (
    <li
      data-flip-id={o.id}
      className="grid gap-x-6 gap-y-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_9.5rem_auto] sm:items-center"
      aria-labelledby={`opp-${o.id}`}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {o.nova ? <PontoNova /> : null}
        <h3 id={`opp-${o.id}`} className="text-base font-bold">
          <Link
            href={`/clientes/${cliente.id}?frente=${frente.id}`}
            className="hover:text-link"
          >
            {cliente.nome}
          </Link>
        </h3>
        {aprovacao ? (
          <span className="text-sm font-semibold text-state-warn">
            Travada em aprovação
          </span>
        ) : (
          <EstadoBadge estado={o.estado} nunca={o.nunca} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-foreground">{o.motivo}</p>
        <Metadados o={o} cliente={cliente} atribuicao={atribuicao} />
      </div>
      <p className="tnum text-sm">
        <span className="font-bold">
          {o.diasParado === null ? "Nunca" : formatarDias(o.diasParado)}
        </span>
        <span className="block text-muted-foreground">
          {aprovacao ? `limite: ${limiteAprovacao} dias` : `prazo: ${o.prazoDias} dias`}
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => onVerProposta(o)}
        aria-label={`Ver proposta para ${cliente.nome}, ${frente.nome}`}
      >
        Ver proposta
      </Button>
    </li>
  )
}
