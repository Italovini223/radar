import type { Metadata, Viewport } from "next"
import { Fraunces, Urbanist } from "next/font/google"

import { AppShell } from "@/components/layout/app-shell"

import "./globals.css"

// Tipografia do site weethub.com: Urbanist no UI, Fraunces (serifa) só em
// h1, números de métrica e wordmark.
const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  display: "swap",
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
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
  themeColor: "#fffff7",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${urbanist.variable} ${fraunces.variable}`}>
      <body suppressHydrationWarning>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
