"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  NAV_CONFIG,
  NAV_PRINCIPAL,
  estaAtivo,
  type NavItem,
} from "@/components/layout/nav-itens"
import { useRadar } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** Item da lista: ícone + rótulo; ativo em azul claro com texto azul. */
function Item({
  item,
  contagem,
  ativo,
  toque,
  onNavegar,
}: {
  item: NavItem
  contagem?: number
  ativo: boolean
  toque: boolean
  onNavegar?: () => void
}) {
  const Icone = item.icone
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavegar}
        aria-current={ativo ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          toque ? "min-h-12" : "min-h-10",
          ativo
            ? "bg-accent text-link"
            : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icone className="size-[1.125rem]" aria-hidden />
        <span className="flex-1">{item.label}</span>
        {contagem !== undefined ? (
          <span className="tnum rounded-full bg-muted px-2 text-xs font-bold text-muted-foreground">
            {contagem}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

/**
 * Navegação em lista (menu do celular). No desktop a navegação é o trilho de
 * ícones (`AppSidebar`). `toque` sobe a altura dos alvos para 48px.
 */
export function NavLista({
  toque = false,
  onNavegar,
}: {
  toque?: boolean
  onNavegar?: () => void
}) {
  const pathname = usePathname()
  const { ready, oportunidades, clients } = useRadar()
  const contagens = {
    oportunidades: ready ? oportunidades.length : undefined,
    clientes: ready ? clients.filter((c) => c.ativo).length : undefined,
  }

  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col justify-between">
      <ul className="flex flex-col gap-0.5">
        {NAV_PRINCIPAL.map((item) => (
          <Item
            key={item.href}
            item={item}
            contagem={item.contagem ? contagens[item.contagem] : undefined}
            ativo={estaAtivo(pathname, item.href)}
            toque={toque}
            onNavegar={onNavegar}
          />
        ))}
      </ul>
      <ul className="border-t pt-2">
        <Item
          item={NAV_CONFIG}
          ativo={estaAtivo(pathname, NAV_CONFIG.href)}
          toque={toque}
          onNavegar={onNavegar}
        />
      </ul>
    </nav>
  )
}

/** Único aviso de dados fictícios do app. */
export function AvisoDemo() {
  return (
    <div className="rounded-lg bg-muted p-3 text-sm">
      <p className="font-semibold text-foreground">Dados de demonstração</p>
      <p className="mt-1 text-muted-foreground">
        Clientes e ações são fictícios e ficam só neste navegador.
      </p>
      <Link
        href="/configuracoes"
        className="mt-2 inline-block font-semibold text-link hover:underline"
      >
        Gerenciar dados
      </Link>
    </div>
  )
}
