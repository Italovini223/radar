"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

import {
  ComDados,
  PageHeading,
  SemResultados,
} from "@/components/radar/page-states"
import { SituacaoBadge } from "@/components/radar/estado"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ESTADO_ORDEM, situacaoDaGrade } from "@/lib/domain/rules"
import type { SituacaoCliente, StatusFrente } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useFlipLista } from "@/lib/motion/use-flip-lista"

const ORDEM_SITUACAO: Record<SituacaoCliente, number> = {
  critico: 2,
  atencao: 1,
  ok: 0,
}

/** "1 crítica · 1 atenção": só o que existe, do pior para o menor. */
function resumoDasFrentes(doCliente: StatusFrente[]): string {
  const conta = (e: StatusFrente["estado"]) =>
    doCliente.filter((g) => g.estado === e).length
  const criticas = conta("critica")
  const atrasadas = conta("atrasada")
  const atencao = conta("atencao")
  const partes: string[] = []
  if (criticas) partes.push(`${criticas} ${criticas === 1 ? "crítica" : "críticas"}`)
  if (atrasadas)
    partes.push(`${atrasadas} ${atrasadas === 1 ? "atrasada" : "atrasadas"}`)
  const travadas = doCliente.filter((g) => g.travada).length
  if (travadas) {
    partes.push(`${travadas} ${travadas === 1 ? "aprovação travada" : "aprovações travadas"}`)
  }
  if (atencao) partes.push(`${atencao} perto do prazo`)
  return partes.length ? partes.join(" · ") : "Tudo em dia"
}

function Conteudo() {
  const { clients, grade, oportunidades, acoes } = useRadar()
  const [busca, setBusca] = useState("")

  const linhas = useMemo(
    () =>
      clients
        .filter((c) => c.ativo)
        .map((c) => {
          const doCliente = grade.filter((g) => g.clientId === c.id)
          const ultima = acoes
            .filter((a) => a.clientId === c.id && a.status === "concluida")
            .reduce<string | undefined>(
              (m, a) => (!m || a.data > m ? a.data : m),
              undefined
            )
          return {
            cliente: c,
            situacao: situacaoDaGrade(doCliente),
            resumo: resumoDasFrentes(doCliente),
            critica: doCliente.some((g) => g.estado === "critica"),
            pior: Math.max(0, ...doCliente.map((g) => ESTADO_ORDEM[g.estado])),
            problemas: doCliente.filter(
              (g) => g.estado === "atrasada" || g.estado === "critica"
            ).length,
            oportunidades: oportunidades.filter((o) => o.clientId === c.id)
              .length,
            ultima,
          }
        })
        // Pior situação primeiro (Crítico, Atenção, Ok), depois pior estado.
        .sort(
          (a, b) =>
            ORDEM_SITUACAO[b.situacao] - ORDEM_SITUACAO[a.situacao] ||
            b.pior - a.pior ||
            b.problemas - a.problemas ||
            a.cliente.nome.localeCompare(b.cliente.nome, "pt-BR")
        ),
    [clients, grade, oportunidades, acoes]
  )

  const termo = busca.trim().toLowerCase()
  const visiveis = linhas.filter(
    (l) =>
      !termo ||
      `${l.cliente.nome} ${l.cliente.responsavel}`.toLowerCase().includes(termo)
  )

  const raiz = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  useFlipLista(listaRef, visiveis.map((l) => l.cliente.id).join("|"))
  useEntrada(raiz)

  return (
    <div ref={raiz}>
      <PageHeading
        title="Clientes"
        description={
          <span className="tnum">
            {linhas.length} {linhas.length === 1 ? "cliente ativo" : "clientes ativos"}
          </span>
        }
      />
      <Input
        data-entra
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        name="busca-clientes"
        autoComplete="off"
        placeholder="Buscar cliente ou squad…"
        aria-label="Buscar clientes"
        className="mb-5 w-full sm:w-80"
      />

      {visiveis.length === 0 ? (
        <SemResultados
          titulo="Nenhum cliente encontrado"
          descricao="Revise o termo da busca."
          onLimpar={busca ? () => setBusca("") : undefined}
        />
      ) : (
        <ul
          ref={listaRef}
          data-entra
          className="divide-y overflow-hidden rounded-lg border bg-card shadow-card"
        >
          {visiveis.map(({ cliente, situacao, resumo, critica, oportunidades: n, ultima }) => (
            <li
              key={cliente.id}
              data-flip-id={cliente.id}
              className="grid gap-x-6 gap-y-1 px-4 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_8rem_10rem_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="font-bold hover:text-link"
                  >
                    {cliente.nome}
                  </Link>
                  <SituacaoBadge situacao={situacao} />
                </div>
                <span className="block text-sm text-muted-foreground">
                  {cliente.responsavel}
                </span>
              </div>
              <p
                className={
                  critica
                    ? "text-sm font-semibold text-state-crit"
                    : "text-sm text-foreground"
                }
              >
                <span className="sr-only">Frentes: </span>
                {resumo}
              </p>
              <p className="tnum text-sm">
                {n} {n === 1 ? "oportunidade" : "oportunidades"}
              </p>
              <p className="tnum text-sm text-muted-foreground">
                {ultima
                  ? `Última ação ${format(parseISO(ultima), "d MMM yyyy", { locale: ptBR })}`
                  : "Nenhuma ação"}
              </p>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="mt-2 w-fit sm:mt-0"
              >
                <Link
                  href={`/clientes/${cliente.id}`}
                  aria-label={`Abrir ficha de ${cliente.nome}`}
                >
                  Ficha
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ClientesView() {
  return (
    <ComDados rows={4}>
      <Conteudo />
    </ComDados>
  )
}
