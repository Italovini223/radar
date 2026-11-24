import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"

import { AppShell } from "@/components/layout/app-shell"

import "./globals.css"

// Geist em todo o UI, como no guia de identidade (pesos 300 a 500).
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Weethub Radar",
    template: "%s · Weethub Radar",
  },
  description:
    "Radar de clientes esquecidos: mostra, por cliente e frente, o que está parado e vira oportunidade. Protótipo com dados fictícios.",
}

export const viewport: Viewport = {
  themeColor: "#e9e8e4",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body suppressHydrationWarning>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
