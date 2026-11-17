"use client"

import { useState } from "react"
import { Menu as MenuIcone } from "lucide-react"

import { RadarLogo } from "@/components/brand/radar-logo"
import { AvisoDemo, NavLista } from "@/components/layout/nav-lista"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/** Abaixo de 1024px: botão "Menu" que abre a lista completa (alvos de 48px). */
export function MobileNav() {
  const [aberto, setAberto] = useState(false)
  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="-ml-2 h-10 min-w-10 px-2.5 lg:hidden"
          aria-label="Menu"
        >
          <MenuIcone className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-5 pt-6">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Telas do Weethub Radar
          </SheetDescription>
          <RadarLogo />
        </SheetHeader>
        <div className="mt-6 flex flex-1 flex-col gap-6">
          <NavLista toque onNavegar={() => setAberto(false)} />
          <AvisoDemo />
        </div>
      </SheetContent>
    </Sheet>
  )
}
