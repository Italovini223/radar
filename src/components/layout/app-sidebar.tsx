"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { RadarMark } from "@/components/brand/radar-mark"
import {
  NAV_CONFIG,
  NAV_PRINCIPAL,
  estaAtivo,
  type NavItem,
} from "@/components/layout/nav-itens"
import { useRadar } from "@/lib/hooks"
import { cn } from "@/lib/utils"

function ItemTrilho({
  item,
  ativo,
  contagem,
}: {
  item: NavItem
  ativo: boolean
  contagem?: number
}) {
  const Icone = item.icone
  return (
    <li>
      <Link
        href={item.href}
        aria-current={ativo ? "page" : undefined}
        aria-label={
          contagem !== undefined ? `${item.label} (${contagem})` : item.label
        }
        className={cn(
          "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] leading-none font-semibold tracking-wide uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          ativo
            ? "bg-accent text-link"
            : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="relative">
          <Icone className="size-5" strokeWidth={ativo ? 2.4 : 2} aria-hidden />
          {contagem ? (
            <span
              aria-hidden
              className="tnum absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-bold tracking-normal text-primary-foreground"
            >
              {contagem}
            </span>
          ) : null}
        </span>
        {item.curto}
      </Link>
    </li>
  )
}

/**
 * Trilho de ícones (76px), como o painel de referência: bloco amarelo da
 * marca no topo, ícone + rótulo curto em caixa alta, item ativo em azul claro.
 * Só a partir de 1024px; abaixo disso entra o menu do celular.
 */
export function AppSidebar() {
  const pathname = usePathname()
  const { ready, oportunidades, clients } = useRadar()
  const contagens = {
    oportunidades: ready ? oportunidades.length : undefined,
    clientes: ready ? clients.filter((c) => c.ativo).length : undefined,
  }

  return (
    <aside className="sticky top-0 z-20 hidden h-svh w-[76px] shrink-0 flex-col border-r bg-sidebar lg:flex">
      <Link
        href="/radar"
        className="flex h-16 shrink-0 items-center justify-center bg-brand text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label="Weethub Radar, ir para o Radar"
      >
        <RadarMark className="size-9" />
      </Link>
      <nav
        aria-label="Principal"
        className="flex flex-1 flex-col justify-between"
      >
        <ul className="flex flex-col">
          {NAV_PRINCIPAL.map((item) => (
            <ItemTrilho
              key={item.href}
              item={item}
              ativo={estaAtivo(pathname, item.href)}
              contagem={item.contagem ? contagens[item.contagem] : undefined}
            />
          ))}
        </ul>
        <ul className="border-t">
          <ItemTrilho
            item={NAV_CONFIG}
            ativo={estaAtivo(pathname, NAV_CONFIG.href)}
          />
        </ul>
      </nav>
    </aside>
  )
}
