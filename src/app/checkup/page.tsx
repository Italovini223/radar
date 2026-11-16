import type { Metadata } from "next"

import { CheckupView } from "@/components/radar/checkup-view"

export const metadata: Metadata = { title: "Check-up" }

export default function CheckupPage() {
  return <CheckupView />
}
