"use client"

import { Suspense, use, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { AcaoDialog, ROTULO_STATUS } from "@/components/radar/acao-dialog"
import { ConfirmacaoPosAcao } from "@/components/radar/confirmacao-pos-acao"
import { EstadoBadge, SituacaoBadge } from "@/components/radar/estado"
import { PainelCliente } from "@/components/radar/painel-cliente"
import { PessoasAtraso } from "@/components/radar/pessoas-atraso"
import { PilhaAvatares } from "@/components/pessoas/avatar-pessoa"
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
import { pessoasEmAtraso, pessoasPorFrente } from "@/lib/domain/pessoas"
import { textoBlocoBloqueio } from "@/lib/domain/rotulos"
import { situacaoDaGrade } from "@/lib/domain/rules"
import type { StatusAcao } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useFlipLista } from "@/lib/motion/use-flip-lista"
import { useRadarStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { nomeCurtoFrente } from "@/lib/domain/frentes"

const ROTULO_ADS = {
  estavel: "estável",
  caindo: "caindo",
  subindo: "subindo",
} as const

function data(iso: string) {
  return format(parseISO(iso), "d 'de' MMM yyyy", { locale: ptBR })
}

function Conteudo({ id }: { id: string }) {
  const {
    clients,
    frentes,
    acoes,
    grade,
    oportunidades,
    checkups,
    hoje,
    configuracao,
  } = useRadar()
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
  const pessoasDaFrente = useMemo(() => pessoasPorFrente(acoes, id), [acoes, id])
  const emAtraso = useMemo(
    () => pessoasEmAtraso(linhas, acoes, id),
    [linhas, acoes, id]
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
            Esse cliente não existe nos dados do Radar.
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
  const situacao = situacaoDaGrade(linhas)
  const naoContratadas = frentes.filter(
    (f) => !linhas.some((l) => l.frenteId === f.id)
  )
  // Loja em criação: relógio de retorno do cliente e contagem até o bloqueio.
  const linhaLoja = linhas.find((l) => l.relogio === "retorno_cliente")
  const lojaEmCriacao = cliente.tipo === "loja_em_criacao"
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
            <SituacaoBadge situacao={situacao} className="mr-2 align-middle" />
            {[cliente.nicho, cliente.responsavel].filter(Boolean).join(" · ")}
            {cliente.nicho || cliente.responsavel ? " · " : null}
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

      <ConfirmacaoPosAcao clienteId={cliente.id} className="mb-6" />

      {lojaEmCriacao ? (
        <section
          aria-labelledby="titulo-loja"
          data-entra
          data-testid="bloco-loja-em-criacao"
          className={cn(
            "mb-6 rounded-lg bg-card p-4 sm:p-5",
            linhaLoja &&
              linhaLoja.diasParaBloqueio !== null &&
              linhaLoja.diasParaBloqueio <= 0 &&
              "border-state-crit-line bg-state-crit-soft"
          )}
        >
          <h2 id="titulo-loja" className="legenda">
            Loja em criação
          </h2>
          {linhaLoja && linhaLoja.dias !== null && linhaLoja.diasParaBloqueio !== null ? (
            <>
              <p className="tnum mt-1 text-lg font-medium">
                {textoBlocoBloqueio(
                  linhaLoja.dias,
                  linhaLoja.diasParaBloqueio,
                  configuracao.bloqueioContratualDias
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                O relógio conta desde a entrega mais antiga que aguarda o
                retorno do cliente
                {linhaLoja.aguardandoDesde ? ` (${data(linhaLoja.aguardandoDesde)})` : ""}.
                Follow-ups concluídos não reiniciam a contagem.
              </p>
            </>
          ) : (
            <p className="mt-1 text-base">
              Nenhuma entrega aguardando o retorno do cliente.
            </p>
          )}
        </section>
      ) : null}

      <PainelCliente
        clienteId={cliente.id}
        linhas={linhas}
        acoes={acoes}
        hoje={hoje}
        frentePorId={frentePorId}
        ultimaAcao={timeline[0]?.data}
      />

      {linhas.some((l) => l.estado === "atrasada" || l.estado === "critica") ? (
        <PessoasAtraso
          clienteId={cliente.id}
          pessoas={emAtraso}
          frentePorId={frentePorId}
        />
      ) : null}

      <div className="grid gap-8 min-[1400px]:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="titulo-frentes" className="min-w-0">
          <h2 id="titulo-frentes" className="mb-3 text-xl font-medium">
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
                    "rounded-lg bg-card p-4",
                    destaque === l.frenteId && "border-foreground bg-secondary"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div>
                      <p className="font-medium">{nomeCurtoFrente(f)}</p>
                      <p className="text-sm text-muted-foreground">{f.setor}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <EstadoBadge estado={l.estado} nunca={l.nunca} />
                      {l.travada ? (
                        <span className="text-sm font-medium text-state-warn">
                          Aprovação travada
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="legenda">Responsável</span>
                    <PilhaAvatares
                      pessoas={pessoasDaFrente.get(l.frenteId) ?? []}
                      alerta={l.estado === "atrasada" || l.estado === "critica"}
                    />
                  </div>
                  <dl className="tnum mt-3 grid grid-cols-3 gap-x-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Última ação</dt>
                      <dd>{l.ultimaAcao ? data(l.ultimaAcao) : "Nunca"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {l.relogio === "retorno_cliente" ? "Sem retorno há" : "Parado há"}
                      </dt>
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
            className="hidden overflow-hidden rounded-lg bg-card md:block"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className="h-11 px-4 text-sm font-medium text-foreground">
                    Frente
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-medium text-foreground">
                    Última ação
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-medium text-foreground">
                    Parado há
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-medium text-foreground">
                    Prazo
                  </TableHead>
                  <TableHead scope="col" className="text-sm font-medium text-foreground">
                    Estado
                  </TableHead>
                  <TableHead scope="col" className="pr-4 text-sm font-medium text-foreground">
                    Responsável
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
                        <span className="font-medium">{nomeCurtoFrente(f)}</span>
                        <span className="block text-sm text-muted-foreground">
                          {f.setor}
                        </span>
                      </TableCell>
                      <TableCell className="tnum text-muted-foreground">
                        {l.ultimaAcao ? data(l.ultimaAcao) : "Nunca"}
                      </TableCell>
                      <TableCell className="tnum">
                        {l.dias === null ? "Nunca" : formatarDias(l.dias)}
                        {l.relogio === "retorno_cliente" ? (
                          <span className="block text-xs text-muted-foreground">
                            sem retorno do cliente
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tnum text-muted-foreground">
                        {l.prazoDias} dias
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <EstadoBadge estado={l.estado} nunca={l.nunca} />
                          {l.travada ? (
                            <span className="text-sm font-medium text-state-warn">
                              Aprovação travada
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="pr-4">
                        <PilhaAvatares
                          pessoas={pessoasDaFrente.get(l.frenteId) ?? []}
                          alerta={l.estado === "atrasada" || l.estado === "critica"}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {naoContratadas.length > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Não contratadas (não entram nos alertas):{" "}
              {naoContratadas.map((f) => nomeCurtoFrente(f)).join(", ")}.
            </p>
          ) : null}
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
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="titulo-timeline" className="text-xl font-medium">
              Linha do tempo
            </h2>
            {timeline.length > 0 ? (
              <span className="legenda tnum">
                {timeline.length} {timeline.length === 1 ? "ação" : "ações"}
              </span>
            ) : null}
          </div>
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
              tabIndex={0}
              aria-label={`Linha do tempo: ${timeline.length} ações, da mais recente para a mais antiga`}
              className="flex max-h-[min(40rem,calc(100svh-11rem))] flex-col overflow-y-auto overscroll-contain rounded-lg bg-card outline-none [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                      <span className="font-medium text-foreground">
                        {f ? nomeCurtoFrente(f) : a.frenteId}
                      </span>
                      {a.status !== "concluida" ? (
                        <span className="font-medium text-state-warn">
                          {ROTULO_STATUS[a.status]}
                        </span>
                      ) : null}
                      {a.origem === "checkup" ? <span>via check-up</span> : null}
                      {a.responsavel ? <span>{a.responsavel}</span> : null}
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
        frentes={frentes.filter((f) => linhas.some((l) => l.frenteId === f.id))}
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
