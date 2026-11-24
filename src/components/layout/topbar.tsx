"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, FlaskConical } from "lucide-react"

import { RadarMark } from "@/components/brand/radar-mark"
import { secaoAtual } from "@/components/layout/nav-itens"
import { MobileNav } from "@/components/layout/mobile-nav"
import { dataCurta } from "@/lib/domain/rotulos"
import { useRadar } from "@/lib/hooks"

/**
 * Barra superior branca (64px), como "MEU PAINEL" na referência: nome da
 * seção em caixa alta à esquerda (ou o caminho Clientes > Cliente na ficha)
 * e o aviso de dados de demonstração à direita. No celular carrega o "Menu".
 */
export function Topbar() {
  const pathname = usePathname()
  const { clients, configuracao } = useRadar()
  const [secao, id] = pathname.split("/").filter(Boolean)
  const aninhado = secao === "clientes" && !!id
  const nome = aninhado ? (clients.find((c) => c.id === id)?.nome ?? "Ficha") : ""
  const atual = secaoAtual(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-8 lg:px-10">
      <MobileNav />
      <Link
        href="/radar"
        aria-label="Weethub Radar, ir para o Radar"
        className="flex size-9 items-center justify-center rounded-md bg-brand text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <RadarMark pequena className="size-6" />
      </Link>

      {aninhado ? (
        <nav aria-label="Você está em" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-lg">
            <li>
              <Link
                href="/clientes"
                className="tracking-wide text-muted-foreground uppercase hover:text-link"
              >
                Clientes
              </Link>
            </li>
            <li aria-hidden className="text-muted-foreground">
              <ChevronRight className="size-4" />
            </li>
            <li
              className="truncate font-semibold tracking-wide text-foreground uppercase"
              aria-current="page"
            >
              {nome}
            </li>
          </ol>
        </nav>
      ) : (
        <p className="truncate text-lg tracking-wide text-foreground uppercase">
          {atual?.label ?? "Weethub Radar"}
        </p>
      )}

      <Link
        href="/configuracoes"
        title="Clientes e ações são fictícios e ficam salvos no banco do Radar."
        className="ml-auto hidden items-center gap-1.5 rounded-md bg-state-warn-soft px-2.5 py-1.5 text-xs font-bold text-state-warn outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
      >
        <FlaskConical className="size-3.5" aria-hidden />
        Dados de demonstração
        {configuracao.usarHojeReal ? null : (
          <span className="tnum font-semibold">
            {" "}
            · ref. {dataCurta(configuracao.dataReferencia)}
          </span>
        )}
      </Link>
    </header>
  )
}
