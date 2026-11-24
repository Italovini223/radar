"use client"

import { useEffect, useMemo, useRef } from "react"
import Link from "next/link"

import {
  FrenteCell,
  FrenteNaoContratada,
} from "@/components/grade/frente-cell"
import { Dica } from "@/components/ui/dica"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { alertasPorFrente } from "@/lib/domain/carteira"
import { ESTADO_ORDEM } from "@/lib/domain/rules"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { useFlipLista } from "@/lib/motion/use-flip-lista"
import type { Client, Frente, StatusFrente } from "@/lib/domain/types"
import { nomeCurtoFrente } from "@/lib/domain/frentes"

/** Último estado visto de cada célula: quem mudou desde a última vez pisca. */
const estadosVistos = new Map<string, string>()

/**
 * Coluna fixa (cliente): quando a tabela rola para o lado, a coluna ganha uma
 * sombra sutil na borda direita. O estado vem de `data-rolagem` na raiz
 * (ver o efeito abaixo); sem rolagem lateral, sem sombra.
 */
const COLUNA_FIXA =
  "sticky left-0 z-[1] bg-card transition-shadow group-data-[rolagem=true]/grade:shadow-[6px_0_8px_-6px_rgb(28_28_26/0.22)]"

const ehProblema = (s: StatusFrente) =>
  s.estado === "atrasada" || s.estado === "critica"

function Numero({ n }: { n: number }) {
  return (
    <span
      className={
        n > 0
          ? "tnum font-medium text-foreground"
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

  // Mesma função do gráfico "Alertas por frente" do Radar: os números batem.
  const porFrente = useMemo(() => {
    const totais = new Map(
      alertasPorFrente(grade, frentes).map((a) => [a.frente.id, a.total])
    )
    return frentes.map((f) => totais.get(f.id) ?? 0)
  }, [grade, frentes])
  const total = porFrente.reduce((a, b) => a + b, 0)

  const raiz = useRef<HTMLDivElement>(null)

  // Rolagem lateral: o contêiner que rola é o da tabela (overflow-x-auto do
  // componente Table), então o estado é lido dele e gravado na raiz.
  useEffect(() => {
    const el = raiz.current
    const rolagem = el?.querySelector<HTMLElement>("[data-slot=table-container]")
    if (!el || !rolagem) return
    const atualizar = () => {
      el.dataset.rolagem = rolagem.scrollLeft > 1 ? "true" : "false"
    }
    atualizar()
    rolagem.addEventListener("scroll", atualizar, { passive: true })
    return () => rolagem.removeEventListener("scroll", atualizar)
  }, [])
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
    <div
      ref={raiz}
      data-rolagem="false"
      className="group/grade overflow-hidden rounded-lg bg-card"
    >
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
              className={`${COLUNA_FIXA} h-14 w-40 border-b px-3 text-xs font-normal normal-case tracking-normal text-muted-foreground`}
            >
              Cliente
            </TableHead>
            {frentes.map((f) => (
              <TableHead
                key={f.id}
                scope="col"
                className="h-14 border-b px-2.5 text-xs font-normal normal-case tracking-normal text-muted-foreground"
              >
                <span className="block" title={f.nome}>{nomeCurtoFrente(f)}</span>
                <span className="tnum block text-[0.6875rem] font-normal text-muted-foreground">
                  prazo {f.prazoDias} dias
                </span>
              </TableHead>
            ))}
            <TableHead
              scope="col"
              className="h-14 w-24 border-b px-3 text-right text-xs font-normal normal-case tracking-normal text-muted-foreground"
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
                className={`${COLUNA_FIXA} border-b px-3 py-1.5 text-left align-middle normal-case tracking-normal text-foreground`}
              >
                {/* No celular a coluna fixa é estreita (nome cortado com
                    reticências), para sobrar espaço de rolagem às frentes. */}
                <div className="max-w-[7.5rem] sm:max-w-none">
                  <Dica texto={`Abrir a ficha de ${c.nome}`} lado="right">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="botao-cliente botao-cliente-sm"
                    >
                      <span className="truncate">{c.nome}</span>
                    </Link>
                  </Dica>
                </div>
              </TableHead>
              {frentes.map((f) => {
                const status = porChave.get(`${c.id}:${f.id}`)
                return (
                  <TableCell key={f.id} className="border-b p-1 align-middle">
                    {status ? (
                      <FrenteCell status={status} cliente={c} frente={f} />
                    ) : (
                      <FrenteNaoContratada />
                    )}
                  </TableCell>
                )
              })}
              <TableCell className="border-b px-3 text-right align-middle">
                <Numero n={problemas} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead
              scope="row"
              className={`${COLUNA_FIXA} px-3 py-3 text-left text-sm font-medium normal-case tracking-normal text-foreground`}
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
