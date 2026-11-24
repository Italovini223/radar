import Link from "next/link"

import { AvatarPessoa } from "@/components/pessoas/avatar-pessoa"
import { ESTADOS, EstadoGlyph } from "@/components/radar/estado"
import { nomeCurtoFrente } from "@/lib/domain/frentes"
import { formatarDias } from "@/lib/domain/opportunities"
import type { PessoaEmAtraso } from "@/lib/domain/pessoas"
import { dataCurta } from "@/lib/domain/rotulos"
import type { Frente } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

/**
 * Perfis das pessoas atreladas às frentes atrasadas ou críticas do cliente:
 * quem já atuou nelas, com quantas demandas atrasadas carrega e quais são.
 * "Última a atuar" marca quem fez a ação mais recente na frente, a primeira
 * pessoa a procurar.
 */
export function PessoasAtraso({
  clienteId,
  pessoas,
  frentePorId,
}: {
  clienteId: string
  pessoas: PessoaEmAtraso[]
  frentePorId: Map<string, Frente>
}) {
  return (
    <section aria-labelledby="titulo-pessoas" className="mb-8">
      <div data-entra className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-pessoas" className="text-xl">
          Pessoas nas demandas atrasadas
        </h2>
        <p className="legenda">
          Quem já atuou nas frentes atrasadas ou críticas deste cliente
        </p>
      </div>

      {pessoas.length === 0 ? (
        <p className="rounded-lg bg-card px-5 py-4 text-sm text-muted-foreground">
          Nenhuma frente atrasada ou crítica com responsável registrado.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {pessoas.map(({ pessoa, demandas, totalAcoes, ultimaAcao }) => {
            const criticas = demandas.filter((d) => d.estado === "critica").length
            return (
              <li
                key={pessoa.id}
                data-entra
                className="flex flex-col gap-4 rounded-lg bg-card p-5"
                aria-label={`${pessoa.nome}: ${demandas.length} ${
                  demandas.length === 1 ? "demanda atrasada" : "demandas atrasadas"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AvatarPessoa pessoa={pessoa} tamanho="lg" alerta={criticas > 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{pessoa.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {pessoa.area ?? "Sem área informada"}
                    </p>
                  </div>
                  <p className="numero text-right text-[2.125rem] leading-9">
                    {demandas.length}
                    <span className="legenda block text-right tracking-normal">
                      {demandas.length === 1 ? "atrasada" : "atrasadas"}
                    </span>
                  </p>
                </div>

                <ul className="flex flex-col divide-y">
                  {demandas.map((d) => {
                    const f = frentePorId.get(d.frenteId)
                    return (
                      <li key={d.frenteId}>
                        <Link
                          href={`/clientes/${clienteId}?frente=${d.frenteId}`}
                          scroll={false}
                          className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none hover:bg-panel-hi focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <EstadoGlyph estado={d.estado} nunca={d.nunca} />
                          <span className="min-w-0 flex-1 truncate">
                            {f ? nomeCurtoFrente(f) : d.frenteId}
                            {d.ultimaAAtuar ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                · última a atuar
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "tnum text-xs font-medium whitespace-nowrap",
                              d.nunca ? ESTADOS.critica.texto : ESTADOS[d.estado].texto
                            )}
                          >
                            {d.nunca || d.dias === null ? "nunca" : formatarDias(d.dias)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                <p className="legenda tnum mt-auto">
                  {totalAcoes} {totalAcoes === 1 ? "ação" : "ações"} neste cliente ·
                  última em {dataCurta(ultimaAcao)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
