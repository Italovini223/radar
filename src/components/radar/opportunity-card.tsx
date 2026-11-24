"use client"

import Link from "next/link"

import { EstadoBadge } from "@/components/radar/estado"
import { Button } from "@/components/ui/button"
import { Dica } from "@/components/ui/dica"
import { impactoDaOportunidade } from "@/lib/ai/proposal"
import { formatarDias } from "@/lib/domain/opportunities"
import {
  bloqueioCurto,
  rotuloRelogio,
  semRetornoDoCliente,
} from "@/lib/domain/rotulos"
import { useRadarStore } from "@/lib/store"
import type {
  Atribuicao,
  Client,
  Frente,
  Opportunity,
} from "@/lib/domain/types"
import { nomeCurtoFrente } from "@/lib/domain/frentes"

interface Props {
  oportunidade: Opportunity
  cliente: Client
  frente: Frente
  atribuicao?: Atribuicao
  tituloAcao?: string
  onVerProposta: (o: Opportunity) => void
  onRegistrarAcao: (o: Opportunity) => void
  /** Alerta mais urgente da tela: "Ver proposta" em coral (só um por tela). */
  destaque?: boolean
  /** Outros alertas do mesmo cliente (aviso "mais N alertas"). */
  maisAlertas?: number
  /** Liga o agrupamento focado no cliente (acionado pelo aviso). */
  onVerCliente?: (c: Client) => void
  /**
   * Dentro do bloco de um cliente (modo "Agrupar por cliente"): o título da
   * linha passa a ser a frente, porque o cliente já é o título do bloco.
   */
  agrupado?: boolean
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

/**
 * "Aurora Moda · mais 3 alertas": o cliente tem outros alertas na carteira.
 * Clicável: abre o agrupamento focado naquele cliente.
 */
function MaisAlertas({
  n,
  cliente,
  onVer,
}: {
  n: number
  cliente: Client
  onVer: (c: Client) => void
}) {
  return (
    <Dica texto={`Ver os ${n + 1} alertas de ${cliente.nome} juntos`}>
      <button
        type="button"
        onClick={() => onVer(cliente)}
        data-mais-alertas={cliente.id}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden>·</span>
        <span className="tnum">
          mais {n} {n === 1 ? "alerta" : "alertas"}
        </span>
        <span className="sr-only"> de {cliente.nome}: ver todos agrupados</span>
      </button>
    </Dica>
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
      {[o.setorResponsavel, cliente.responsavel].filter(Boolean).join(" · ")}
      {atribuicao ? (
        <span className="font-medium text-state-ok">
          {" "}
          · Atribuída a {atribuicao.setor}
        </span>
      ) : null}
    </p>
  )
}

/**
 * Crítica: cartão cheio, com o número grande (peso 300) e "Ver proposta" como
 * ação primária: coral no alerta mais urgente (`destaque`), tinta nos demais.
 */
export function OportunidadeCheia({
  oportunidade: o,
  cliente,
  frente,
  atribuicao,
  tituloAcao,
  onVerProposta,
  onRegistrarAcao,
  destaque = false,
  maisAlertas = 0,
  onVerCliente,
}: Props) {
  const impacto = impactoDaOportunidade({
    oportunidade: o,
    clienteNome: cliente.nome,
    frenteNome: nomeCurtoFrente(frente),
    setor: frente.setor,
    tituloAcao,
  })
  return (
    <li data-flip-id={o.id}>
      <article
        className="rounded-lg bg-card p-5"
        aria-labelledby={`opp-${o.id}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {o.nova ? <PontoNova /> : null}
              <h3 id={`opp-${o.id}`} className="text-base leading-tight font-medium">
                <Dica texto={`Abrir a ficha de ${cliente.nome}, com ${nomeCurtoFrente(frente)} em destaque`}>
                  <Link
                    href={`/clientes/${cliente.id}?frente=${frente.id}`}
                    className="botao-cliente"
                  >
                    {cliente.nome}
                  </Link>
                </Dica>
              </h3>
              <EstadoBadge estado={o.estado} nunca={o.nunca} />
              {maisAlertas > 0 && onVerCliente ? (
                <MaisAlertas n={maisAlertas} cliente={cliente} onVer={onVerCliente} />
              ) : null}
            </div>
            <p className="mt-2 text-base font-medium">{o.motivo}</p>
            <p className="mt-1 text-sm text-muted-foreground">{impacto}</p>
            <div className="mt-3">
              <Metadados o={o} cliente={cliente} atribuicao={atribuicao} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-1 border-t pt-4 sm:min-w-40 sm:items-end sm:border-t-0 sm:pt-0">
            <span className="legenda">
              {rotuloRelogio(o)}
            </span>
            <span className="numero text-[1.75rem] leading-none text-state-crit">
              {o.diasParado === null ? "Nunca" : formatarDias(o.diasParado)}
            </span>
            <span className="tnum text-sm text-muted-foreground">
              prazo: {o.prazoDias} dias
            </span>
            {semRetornoDoCliente(o) && o.diasParaBloqueio !== null ? (
              <span className="tnum text-sm font-medium text-state-crit">
                {bloqueioCurto(o.diasParaBloqueio)}
              </span>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant={destaque ? "resolver" : "default"}
                dica="Ver o rascunho de mensagem para o cliente e atribuir a um setor"
                onClick={() => onVerProposta(o)}
                aria-label={`Ver proposta para ${cliente.nome}, ${frente.nome}`}
              >
                Ver proposta
              </Button>
              <Button
                variant="outline"
                dica="Registrar o que foi feito nesta frente: o prazo volta a contar do zero"
                onClick={() => onRegistrarAcao(o)}
                aria-label={`Registrar ação para ${cliente.nome}, ${frente.nome}`}
              >
                Registrar ação
              </Button>
            </div>
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
  onRegistrarAcao,
  maisAlertas = 0,
  onVerCliente,
  agrupado = false,
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
        <h3 id={`opp-${o.id}`} className="text-base font-medium">
          {agrupado ? (
            nomeCurtoFrente(frente)
          ) : (
            <Dica texto={`Abrir a ficha de ${cliente.nome}, com ${nomeCurtoFrente(frente)} em destaque`}>
              <Link
                href={`/clientes/${cliente.id}?frente=${frente.id}`}
                className="botao-cliente botao-cliente-sm"
              >
                {cliente.nome}
              </Link>
            </Dica>
          )}
        </h3>
        {aprovacao ? (
          <span className="text-sm font-medium text-state-warn">
            Travada em aprovação
          </span>
        ) : (
          <EstadoBadge estado={o.estado} nunca={o.nunca} />
        )}
        {maisAlertas > 0 && onVerCliente && !agrupado ? (
          <MaisAlertas n={maisAlertas} cliente={cliente} onVer={onVerCliente} />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-foreground">{o.motivo}</p>
        <Metadados o={o} cliente={cliente} atribuicao={atribuicao} />
      </div>
      <p className="tnum text-sm">
        {semRetornoDoCliente(o) ? (
          <span className="block text-xs text-muted-foreground">
            sem retorno do cliente
          </span>
        ) : null}
        <span className="font-medium">
          {o.diasParado === null ? "Nunca" : formatarDias(o.diasParado)}
        </span>
        <span className="block text-muted-foreground">
          {aprovacao ? `limite: ${limiteAprovacao} dias` : `prazo: ${o.prazoDias} dias`}
        </span>
        {semRetornoDoCliente(o) && o.diasParaBloqueio !== null ? (
          <span className="block font-medium text-state-crit">
            {bloqueioCurto(o.diasParaBloqueio)}
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          dica="Ver o rascunho de mensagem para o cliente e atribuir a um setor"
                onClick={() => onVerProposta(o)}
          aria-label={`Ver proposta para ${cliente.nome}, ${frente.nome}`}
        >
          Ver proposta
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          dica="Registrar o que foi feito nesta frente: o prazo volta a contar do zero"
                onClick={() => onRegistrarAcao(o)}
          aria-label={`Registrar ação para ${cliente.nome}, ${frente.nome}`}
        >
          Registrar ação
        </Button>
      </div>
    </li>
  )
}
