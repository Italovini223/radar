"use client"

import { useEffect, type ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useRadarStore } from "@/lib/store"

export function AppShell({ children }: { children: ReactNode }) {
  const iniciar = useRadarStore((s) => s.iniciar)

  useEffect(() => {
    void iniciar()
  }, [iniciar])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-svh w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <Topbar />
          <main
            id="conteudo"
            className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-7 pb-14 sm:px-8 lg:px-10"
          >
            {children}
          </main>
        </div>
        <Toaster theme="light" position="bottom-right" />
      </div>
    </TooltipProvider>
  )
}
