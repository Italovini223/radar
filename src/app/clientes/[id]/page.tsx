import type { Metadata } from "next"

import { FichaView } from "@/components/radar/ficha-view"

export const metadata: Metadata = { title: "Ficha do cliente" }

export default function FichaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <FichaView params={params} />
}
