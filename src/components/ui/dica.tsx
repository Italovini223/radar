"use client"

import type { ReactElement, ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Dica de interação: tooltip curto que diz o que acontece ao clicar.
 * Envolve um único elemento interativo (link, botão, célula clicável) e
 * aparece no hover e no foco do teclado. Use frase curta no infinitivo,
 * começando pelo efeito: "Abrir a ficha do cliente", "Filtrar a lista".
 *
 * Sem `texto`, devolve o filho sem tooltip (útil para dicas condicionais).
 */
export function Dica({
  texto,
  lado = "top",
  children,
}: {
  texto?: ReactNode
  lado?: "top" | "bottom" | "left" | "right"
  children: ReactElement
}) {
  if (!texto) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={lado} sideOffset={6} className="max-w-64">
        {/* Bloco: o conteúdo do tooltip é flex e quebraria <b>/<br> em colunas. */}
        <span className="block leading-snug text-pretty">{texto}</span>
      </TooltipContent>
    </Tooltip>
  )
}
