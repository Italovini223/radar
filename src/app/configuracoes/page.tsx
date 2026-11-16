import type { Metadata } from "next"

import { ConfiguracoesView } from "@/components/radar/configuracoes-view"

export const metadata: Metadata = { title: "Configurações" }

export default function ConfiguracoesPage() {
  return <ConfiguracoesView />
}
