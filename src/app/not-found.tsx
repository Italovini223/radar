import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

export default function NotFound() {
  return (
    <Empty className="border py-14">
      <EmptyHeader>
        <EmptyTitle>Página não encontrada</EmptyTitle>
        <EmptyDescription>
          Este endereço não existe no Radar.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="sm">
          <Link href="/radar">Voltar ao Radar</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
