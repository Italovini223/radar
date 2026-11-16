"use client"

import Link from "next/link"

import { RadarLogo } from "@/components/brand/radar-logo"
import { AvisoDemo, NavLista } from "@/components/layout/nav-lista"

/** Sidebar fixa só a partir de 1024px; abaixo disso entra o menu do celular. */
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-4 pt-5 pb-5 lg:flex">
      <Link
        href="/radar"
        className="flex h-11 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Weethub Radar, ir para o Radar"
      >
        <RadarLogo />
      </Link>
      <NavLista />
      <AvisoDemo />
    </aside>
  )
}
