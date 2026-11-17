import type { Metadata, Viewport } from "next"
import { Nunito_Sans } from "next/font/google"

import { AppShell } from "@/components/layout/app-shell"

import "./globals.css"

// Uma família sans arredondada no UI inteiro, como no painel de referência.
const nunito = Nunito_Sans({
  variable: "--font-nunito",
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
  themeColor: "#f3f4f6",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body suppressHydrationWarning>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
