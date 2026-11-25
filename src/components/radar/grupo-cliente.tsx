"use client"

import Link from "next/link"

import { SituacaoBadge } from "@/components/radar/estado"
import { OportunidadeLinha } from "@/components/radar/opportunity-card"
import { Dica } from "@/components/ui/dica"
import type { GrupoCliente } from "@/lib/domain/carteira"
import type {
  Atribuicao,
  Frente,
  Opportunity,
} from "@/lib/domain/types"

/**
 * Bloco de um cliente no modo "Agrupar por cliente": o nome (botão para a
 * ficha), a situação, quantos alertas, e os alertas do cliente em linhas, do
 * mais grave para o menos grave.
 */
export function GrupoDoCliente({
  grupo,
  frentePorId,
  atribuicaoDe,
  tituloAcaoDe,
  onVerProposta,
  onRegistrarAcao,
}: {
  grupo: GrupoCliente
  frentePorId: ReadonlyMap<string, Frente>
  atribuicaoDe: (id: string) => Atribuicao | undefined
  tituloAcaoDe: (o: Opportunity) => string | undefined
  onVerProposta: (o: Opportunity) => void
  onRegistrarAcao: (o: Opportunity) => void
}) {
  const { cliente, situacao, alertas } = grupo
  const n = alertas.length
  return (
    <li data-grupo-cliente={cliente.id}>
      <section
        aria-labelledby={`grupo-${cliente.id}`}
        className="overflow-hidden rounded-lg bg-card"
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-3">
          <h3 id={`grupo-${cliente.id}`} className="text-base font-medium">
            <Dica texto={`Abrir a ficha de ${cliente.nome}`}>
              <Link href={`/clientes/${cliente.id}`} className="botao-cliente">
                {cliente.nome}
              </Link>
            </Dica>
          </h3>
          <SituacaoBadge situacao={situacao} />
          <span className="tnum text-sm text-muted-foreground">
            {n} {n === 1 ? "alerta" : "alertas"}
          </span>
        </header>
        <ul className="divide-y">
          {alertas.map((o) => {
            const frente = frentePorId.get(o.frenteId)
            if (!frente) return null
            return (
              <OportunidadeLinha
                key={o.id}
                agrupado
                oportunidade={o}
                cliente={cliente}
                frente={frente}
                atribuicao={atribuicaoDe(o.id)}
                tituloAcao={tituloAcaoDe(o)}
                onVerProposta={onVerProposta}
                onRegistrarAcao={onRegistrarAcao}
              />
            )
          })}
        </ul>
      </section>
    </li>
  )
}
