"use client"

import { useRef } from "react"

import { gsap, useGSAP } from "./gsap"
import { movimento } from "./movimento"
import { DUR, EASE } from "./tokens"

/** Último valor mostrado por chave: ao voltar para a tela, conta a partir dele. */
const memoria = new Map<string, number>()

/**
 * Número que conta até o novo valor (0,6 s, inteiros) quando o dado muda.
 * O leitor de tela lê só o valor final; a contagem visual é `aria-hidden`.
 */
export function Numero({
  valor,
  chave,
  className,
  dataNumero,
}: {
  valor: number
  chave: string
  className?: string
  dataNumero?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const tween = useRef<gsap.core.Tween | null>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      const mostrado = el.textContent
      const de = mostrado ? Number(mostrado) : (memoria.get(chave) ?? 0)
      memoria.set(chave, valor)
      const pintar = (n: number) => {
        el.textContent = String(Math.round(n))
      }
      tween.current?.kill()
      return movimento(
        () => {
          pintar(de)
          if (de === valor) return
          const proxy = { n: de }
          tween.current = gsap.to(proxy, {
            n: valor,
            duration: DUR.contagem,
            ease: EASE.saida,
            onUpdate: () => pintar(proxy.n),
            onComplete: () => pintar(valor),
          })
        },
        () => pintar(valor)
      )
    },
    { dependencies: [valor], revertOnUpdate: true }
  )

  return (
    <span className={className}>
      <span ref={ref} aria-hidden data-numero={dataNumero} />
      <span className="sr-only">{valor}</span>
    </span>
  )
}
