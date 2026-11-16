"use client"

import { useMemo, useRef } from "react"
import Link from "next/link"

import { FrenteCell } from "@/components/grade/frente-cell"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ESTADO_ORDEM } from "@/lib/domain/rules"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { useFlipLista } from "@/lib/motion/use-flip-lista"
import type { Client, Frente, StatusFrente } from "@/lib/domain/types"

/** Último estado visto de cada célula: quem mudou desde a última vez pisca. */
const estadosVistos = new Map<string, string>()

const ehProblema = (s: StatusFrente) =>
  s.estado === "atrasada" || s.estado === "critica"

function Numero({ n }: { n: number }) {
  return (
    <span
      className={
        n > 0
          ? "tnum font-bold text-foreground"
          : "tnum text-muted-foreground"
      }
    >
      {n}
    </span>
  )
}

export function GradeTable({
  clients,
  frentes,
  grade,
}: {
  clients: Client[]
  frentes: Frente[]
  grade: StatusFrente[]
}) {
  const porChave = useMemo(
    () => new Map(grade.map((s) => [`${s.clientId}:${s.frenteId}`, s])),
    [grade]
  )

  // Pior estado primeiro; depois mais problemas; depois ordem alfabética.
  const linhas = useMemo(() => {
    const idsFrentes = new Set(frentes.map((f) => f.id))
    return clients
      .map((c) => {
        const status = grade.filter(
          (s) => s.clientId === c.id && idsFrentes.has(s.frenteId)
        )
        return {
          cliente: c,
          problemas: status.filter(ehProblema).length,
          pior: Math.max(0, ...status.map((s) => ESTADO_ORDEM[s.estado])),
        }
      })
      .sort(
        (a, b) =>
          b.pior - a.pior ||
          b.problemas - a.problemas ||
          a.cliente.nome.localeCompare(b.cliente.nome, "pt-BR")
      )
  }, [clients, frentes, grade])

  const porFrente = frentes.map((f) =>
    grade.filter((s) => s.frenteId === f.id && ehProblema(s)).length
  )
  const total = porFrente.reduce((a, b) => a + b, 0)

  const raiz = useRef<HTMLDivElement>(null)
  useFlipLista(raiz, linhas.map((l) => l.cliente.id).join("|"))

  // Célula que mudou de estado faz um flash curto (só opacidade, 0,6 s).
  const chaveEstados = grade.map((s) => `${s.clientId}:${s.frenteId}:${s.estado}${s.nunca ? "n" : ""}`).join("|")
  useGSAP(
    () => {
      const mudou: HTMLElement[] = []
      const vistos = new Map<string, string>()
      raiz.current
        ?.querySelectorAll<HTMLElement>("[data-celula]")
        .forEach((el) => {
          const k = el.dataset.celula ?? ""
          const e = el.dataset.estado ?? ""
          const antes = estadosVistos.get(k)
          if (antes !== undefined && antes !== e) {
            const flash = el.querySelector<HTMLElement>("[data-flash]")
            if (flash) mudou.push(flash)
          }
          vistos.set(k, e)
        })
      // Só grava depois do efeito (e do ciclo duplo do React em desenvolvimento).
      const t = setTimeout(() => {
        vistos.forEach((e, k) => estadosVistos.set(k, e))
      }, 0)
      const parar = movimento(() => {
        if (mudou.length === 0) return
        gsap.fromTo(
          mudou,
          { opacity: 0.2 },
          { opacity: 0, duration: 0.6, ease: "power2.out" }
        )
      })
      return () => {
        clearTimeout(t)
        parar()
      }
    },
    { dependencies: [chaveEstados], scope: raiz }
  )

  return (
    <div ref={raiz} className="overflow-hidden rounded-md border bg-card">
      <Table className="min-w-[56rem] border-separate border-spacing-0">
        <caption className="sr-only">
          Grade de clientes por frente, do cliente em pior estado para o
          melhor: dias desde a última ação concluída e estado de cada par, com
          a contagem de frentes atrasadas ou críticas por cliente e por frente.
        </caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              scope="col"
              className="sticky left-0 z-[1] h-14 w-40 border-b bg-card px-3 text-sm font-bold text-foreground"
            >
              Cliente
            </TableHead>
            {frentes.map((f) => (
              <TableHead
                key={f.id}
                scope="col"
                className="h-14 border-b px-1.5 text-sm font-bold text-foreground"
              >
                <span className="block">{f.nome}</span>
                <span className="tnum block text-xs font-normal text-muted-foreground">
                  prazo {f.prazoDias} dias
                </span>
              </TableHead>
            ))}
            <TableHead
              scope="col"
              className="h-14 w-24 border-b px-3 text-right text-sm font-bold text-foreground"
            >
              Problemas
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map(({ cliente: c, problemas }) => (
            <TableRow
              key={c.id}
              data-flip-id={c.id}
              className="hover:bg-transparent"
            >
              <TableHead
                scope="row"
                className="sticky left-0 z-[1] border-b bg-card px-3 py-1.5 text-left align-middle"
              >
                <Link
                  href={`/clientes/${c.id}`}
                  className="text-sm font-bold hover:underline"
                >
                  {c.nome}
                </Link>
              </TableHead>
              {frentes.map((f) => {
                const status = porChave.get(`${c.id}:${f.id}`)
                return (
                  <TableCell key={f.id} className="border-b p-1 align-middle">
                    {status ? (
                      <FrenteCell status={status} cliente={c} frente={f} />
                    ) : null}
                  </TableCell>
                )
              })}
              <TableCell className="border-b px-3 text-right align-middle">
                <Numero n={problemas} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableHead
              scope="row"
              className="sticky left-0 z-[1] bg-card px-3 py-3 text-left text-sm font-bold"
            >
              Problemas
            </TableHead>
            {porFrente.map((n, i) => (
              <TableCell key={frentes[i].id} className="px-2.5 py-3">
                <Numero n={n} />
              </TableCell>
            ))}
            <TableCell className="px-3 py-3 text-right">
              <Numero n={total} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
