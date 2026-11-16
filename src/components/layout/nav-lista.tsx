"use client"

import { useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useRadar } from "@/lib/hooks"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { DUR, EASE } from "@/lib/motion/tokens"
import { cn } from "@/lib/utils"

/** Item ativo: negrito; o marcador amarelo de 3px desliza entre itens (NavLista). */
function Item({
  href,
  label,
  contagem,
  ativo,
  toque,
  onNavegar,
}: {
  href: string
  label: string
  contagem?: number
  ativo: boolean
  toque: boolean
  onNavegar?: () => void
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavegar}
        aria-current={ativo ? "page" : undefined}
        className={cn(
          "relative flex items-center justify-between rounded-md px-3 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
          toque ? "min-h-12" : "min-h-10",
          ativo && "font-bold text-foreground"
        )}
      >
        {label}
        {contagem !== undefined ? (
          <span className="tnum text-sm font-normal text-muted-foreground">
            {contagem}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

/**
 * Navegação principal (só texto): quatro telas numa lista; Configurações fica
 * separada embaixo. `toque` sobe a altura dos alvos para 48px (menu do celular).
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
  const ativo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  // Marcador do item ativo: um só elemento que desliza (y) ao trocar de rota.
  const nav = useRef<HTMLElement>(null)
  const marcador = useRef<HTMLSpanElement>(null)
  const posicionado = useRef(false)
  useGSAP(
    () => {
      const m = marcador.current
      const alvo = nav.current?.querySelector<HTMLElement>("[aria-current=page]")
      if (!m) return
      if (!alvo) {
        gsap.set(m, { autoAlpha: 0 })
        posicionado.current = false
        return
      }
      const y = alvo.offsetTop + 8
      const h = alvo.offsetHeight - 16
      if (!posicionado.current) {
        posicionado.current = true
        gsap.set(m, { y, height: h, autoAlpha: 1 })
        return
      }
      return movimento(
        () => {
          gsap.set(m, { height: h, autoAlpha: 1 })
          gsap.to(m, { y, duration: DUR.base, ease: EASE.forte })
        },
        () => {
          gsap.set(m, { y, height: h, autoAlpha: 1 })
        }
      )
    },
    { dependencies: [pathname], scope: nav }
  )

  return (
    <nav
      ref={nav}
      aria-label="Principal"
      className="relative flex flex-1 flex-col justify-between"
    >
      <span
        ref={marcador}
        aria-hidden
        className="pointer-events-none absolute top-0 -left-0.5 w-[3px] rounded-full bg-brand opacity-0"
      />
      <ul className="flex flex-col gap-0.5">
        <Item
          href="/radar"
          label="Radar"
          contagem={ready ? oportunidades.length : undefined}
          ativo={ativo("/radar")}
          toque={toque}
          onNavegar={onNavegar}
        />
        <Item
          href="/grade"
          label="Grade"
          ativo={ativo("/grade")}
          toque={toque}
          onNavegar={onNavegar}
        />
        <Item
          href="/clientes"
          label="Clientes"
          contagem={ready ? clients.filter((c) => c.ativo).length : undefined}
          ativo={ativo("/clientes")}
          toque={toque}
          onNavegar={onNavegar}
        />
        <Item
          href="/checkup"
          label="Check-up"
          ativo={ativo("/checkup")}
          toque={toque}
          onNavegar={onNavegar}
        />
      </ul>
      <ul className="border-t pt-2">
        <Item
          href="/configuracoes"
          label="Configurações"
          ativo={ativo("/configuracoes")}
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
    <div className="border-t pt-4 text-sm">
      <p className="font-semibold text-foreground">Dados de demonstração</p>
      <p className="mt-1 text-muted-foreground">
        Clientes e ações são fictícios e ficam só neste navegador.
      </p>
      <Link
        href="/configuracoes"
        className="mt-2 inline-block font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4"
      >
        Gerenciar dados
      </Link>
    </div>
  )
}
