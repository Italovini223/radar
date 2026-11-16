"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-2xl">
      <AlertTitle>Algo deu errado nesta tela</AlertTitle>
      <AlertDescription>
        <p>
          Os dados salvos continuam no navegador. Tente recarregar a tela; se o
          erro voltar, use &quot;Resetar dados de demonstração&quot; em
          Configurações.
        </p>
        <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
          Tentar de novo
        </Button>
      </AlertDescription>
    </Alert>
  )
}
