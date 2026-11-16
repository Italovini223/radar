"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { RadarMark } from "@/components/brand/radar-mark"
import { MobileNav } from "@/components/layout/mobile-nav"
import { useRadar } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/**
 * Barra superior. No desktop só existe quando há um nível a mostrar
 * (Clientes / Flor de Sal); nas demais telas o h1 já diz onde você está.
 * No celular ela carrega o botão "Menu".
 */
export function Topbar() {
  const pathname = usePathname()
  const { clients } = useRadar()
  const [secao, id] = pathname.split("/").filter(Boolean)
  const aninhado = secao === "clientes" && !!id
  const nome = aninhado ? (clients.find((c) => c.id === id)?.nome ?? "Ficha") : ""

  return (
    <header
      className={cn(
        "sticky top-0 z-10 h-14 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-8 lg:px-11",
        aninhado ? "flex" : "flex lg:hidden"
      )}
    >
      <MobileNav />
      {aninhado ? (
        <nav aria-label="Você está em" className="min-w-0 text-sm">
          <ol className="flex items-center gap-2 text-muted-foreground">
            <li>
              <Link
                href="/clientes"
                className="hover:text-foreground hover:underline"
              >
                Clientes
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li
              className="truncate font-semibold text-foreground"
              aria-current="page"
            >
              {nome}
            </li>
          </ol>
        </nav>
      ) : (
        <Link
          href="/radar"
          aria-label="Weethub Radar, ir para o Radar"
          className="ml-auto rounded-md text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <RadarMark className="size-7" />
        </Link>
      )}
    </header>
  )
}
