"use client"

import { Suspense, use, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { AcaoDialog, ROTULO_STATUS } from "@/components/radar/acao-dialog"
import { EstadoBadge } from "@/components/radar/estado"
import {
  ComDados,
  PageHeading,
  PageSkeleton,
} from "@/components/radar/page-states"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatarDias } from "@/lib/domain/opportunities"
import type { StatusAcao } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useFlipLista } from "@/lib/motion/use-flip-lista"
import { useRadarStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const ROTULO_ADS = {
  estavel: "estável",
  caindo: "caindo",
  subindo: "subindo",
} as const

function data(iso: string) {
  return format(parseISO(iso), "d 'de' MMM yyyy", { locale: ptBR })
}

function Conteudo({ id }: { id: string }) {
  const { clients, frentes, acoes, grade, oportunidades, checkups, hoje } =
    useRadar()
  const atualizarStatus = useRadarStore((s) => s.atualizarStatusAcao)
  const destaque = useSearchParams().get("frente") ?? undefined
  const [dialogo, setDialogo] = useState(false)

  const cliente = clients.find((c) => c.id === id)
  const frentePorId = useMemo(
    () => new Map(frentes.map((f) => [f.id, f])),
    [frentes]
  )
  const linhas = useMemo(
    () => grade.filter((g) => g.clientId === id),
    [grade, id]
  )
  const timeline = useMemo(
    () =>
      acoes
        .filter((a) => a.clientId === id)
        .sort(
          (a, b) =>
            b.data.localeCompare(a.data) || b.id.localeCompare(a.id)
        ),
    [acoes, id]
  )
  const ultimoCheckup = useMemo(
    () =>
      checkups
        .filter((c) => c.clientId === id)
        .sort((a, b) => b.data.localeCompare(a.data))[0],
    [checkups, id]
  )

  const raiz = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLOListElement>(null)
  useFlipLista(timelineRef, timeline.map((a) => a.id).join("|"), {
    destaqueEntrada: true,
  })
  useEntrada(raiz)

  if (!cliente) {
    return (
      <Empty className="border py-14">
        <EmptyHeader>
          <EmptyTitle>Cliente não encontrado</EmptyTitle>
          <EmptyDescription>
            Esse cliente não existe nos dados deste navegador.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm">
            <Link href="/clientes">Ver todos os clientes</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const emDia = linhas.filter((l) => l.estado === "em_dia").length
  const nOpps = oportunidades.filter((o) => o.clientId === id).length

  function mudarStatus(acaoId: string, status: StatusAcao, msg: string) {
    atualizarStatus(acaoId, status)
    toast.success(msg)
  }

  return (
    <div ref={raiz}>
      <PageHeading
        title={cliente.nome}
        description={
          <>
            {cliente.segmento} · {cliente.responsavel} ·{" "}
            <span className="tnum">
              {emDia} de {linhas.length} frentes em dia, {nOpps}{" "}
              {nOpps === 1 ? "oportunidade" : "oportunidades"}
            </span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/checkup?cliente=${cliente.id}`}>
                Fazer check-up
              </Link>
            </Button>
            <Button onClick={() => setDialogo(true)}>
              Registrar ação
            </Button>
          </>
        }
      />

      <div className="grid gap-8 min-[1400px]:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="titulo-frentes" className="min-w-0">
          <h2 id="titulo-frentes" className="mb-3 text-xl font-semibold">
            Frentes
          </h2>
          {/* Abaixo de md: um cartão por frente, com o Estado visível. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {linhas.map((l) => {
              const f = frentePorId.get(l.frenteId)
              if (!f) return null
              return (
                <li
                  key={l.frenteId}
                  data-entra
                  data-destaque={destaque === l.frenteId || undefined}
                  className={cn(
                    "rounded-md border bg-card p-4",
                    destaque === l.frenteId && "border-foreground bg-secondary"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div>
                      <p className="font-bold">{f.nome}</p>
                      <p className="text-sm text-muted-foreground">{f.setor}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <EstadoBadge estado={l.estado} nunca={l.nunca} />
                      {l.travada ? (
                        <span className="text-sm font-semibold text-state-warn">
                          Aprovação travada
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <dl className="tnum mt-3 grid grid-cols-3 gap-x-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Última ação</dt>
                      <dd>{l.ultimaAcao ? data(l.ultimaAcao) : "Nunca"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Parado há</dt>
                      <dd>{l.dias === null ? "Nunca" : formatarDias(l.dias)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Prazo</dt>
                      <dd>{l.prazoDias} dias</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>

          <div
            data-entra
            className="hidden overflow-hidden rounded-md border bg-card md:block"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className="h-11 px-4 text-sm font-bold text-foreground">
                    Frente
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-bold text-foreground">
                    Última ação
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-bold text-foreground">
                    Parado há
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-bold text-foreground">
                    Prazo
                  </TableHead>
                  <TableHead scope="col" className="pr-4 text-sm font-bold text-foreground">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const f = frentePorId.get(l.frenteId)
                  if (!f) return null
                  return (
                    <TableRow
                      key={l.frenteId}
                      data-destaque={destaque === l.frenteId || undefined}
                      className={cn(
                        destaque === l.frenteId && "bg-secondary hover:bg-secondary"
                      )}
                    >
                      <TableCell className="px-4 py-2.5">
                        <span className="font-semibold">{f.nome}</span>
                        <span className="block text-sm text-muted-foreground">
                          {f.setor}
                        </span>
                      </TableCell>
                      <TableCell className="tnum text-muted-foreground">
                        {l.ultimaAcao ? data(l.ultimaAcao) : "Nunca"}
                      </TableCell>
                      <TableCell className="tnum">
                        {l.dias === null ? "Nunca" : formatarDias(l.dias)}
                      </TableCell>
                      <TableCell className="tnum text-muted-foreground">
                        {l.prazoDias} dias
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <EstadoBadge estado={l.estado} nunca={l.nunca} />
                          {l.travada ? (
                            <span className="text-sm font-semibold text-state-warn">
                              Aprovação travada
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {ultimoCheckup ? (
              <>
                Último check-up em {data(ultimoCheckup.data)}
                {ultimoCheckup.resultadoAds
                  ? `. Resultado de Ads informado: ${ROTULO_ADS[ultimoCheckup.resultadoAds]}.`
                  : "."}{" "}
                O resultado de Ads é anotação manual e não muda os alertas.
              </>
            ) : (
              "Nenhum check-up registrado para este cliente."
            )}
          </p>
        </section>

        <section aria-labelledby="titulo-timeline" className="min-w-0">
          <h2 id="titulo-timeline" className="mb-3 text-xl font-semibold">
            Linha do tempo
          </h2>
          {timeline.length === 0 ? (
            <Empty className="border py-10">
              <EmptyHeader>
                <EmptyTitle>Nenhuma ação registrada</EmptyTitle>
                <EmptyDescription>
                  Registre a primeira ação ou faça um check-up.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ol
              ref={timelineRef}
              className="flex flex-col rounded-md border bg-card"
            >
              {timeline.map((a) => {
                const f = frentePorId.get(a.frenteId)
                return (
                  <li
                    key={a.id}
                    data-entra
                    data-flip-id={a.id}
                    className="flex flex-col gap-1.5 border-b px-4 py-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <time dateTime={a.data} className="tnum font-medium text-foreground">
                        {data(a.data)}
                      </time>
                      <span className="font-bold text-foreground">
                        {f?.nome ?? a.frenteId}
                      </span>
                      {a.status !== "concluida" ? (
                        <span className="font-semibold text-state-warn">
                          {ROTULO_STATUS[a.status]}
                        </span>
                      ) : null}
                      {a.origem === "checkup" ? <span>via check-up</span> : null}
                    </div>
                    <p className="text-sm">{a.titulo}</p>
                    {a.status === "aguardando_aprovacao" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-fit"
                        onClick={() =>
                          mudarStatus(a.id, "concluida", "Entrega aprovada e concluída.")
                        }
                      >
                        Marcar como aprovada
                      </Button>
                    ) : null}
                    {a.status === "em_andamento" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-fit"
                        onClick={() =>
                          mudarStatus(a.id, "concluida", "Ação concluída.")
                        }
                      >
                        Marcar como concluída
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      <AcaoDialog
        aberto={dialogo}
        onOpenChange={setDialogo}
        cliente={cliente}
        frentes={frentes}
        frenteInicial={destaque}
        hoje={hoje}
      />
    </div>
  )
}

function Carregador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <ComDados rows={4}>
      <Conteudo id={id} />
    </ComDados>
  )
}

export function FichaView({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Carregador params={params} />
    </Suspense>
  )
}
