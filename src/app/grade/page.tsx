import type { Metadata } from "next"

import { GradeView } from "@/components/grade/grade-view"

export const metadata: Metadata = { title: "Grade" }

export default function GradePage() {
  return <GradeView />
}
