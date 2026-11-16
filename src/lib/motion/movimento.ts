import { gsap } from "./gsap"
import { QUERY_NORMAL, QUERY_REDUZ } from "./tokens"

type Limpeza = void | (() => void)

/**
 * Roda `normal` quando o usuário aceita movimento e `reduz` (opcional) quando
 * pediu menos movimento (prefers-reduced-motion). Com `reduz` o estado final
 * deve ser aplicado na hora, sem tween. Devolve a limpeza (reverte tudo): use
 * como retorno do callback do useGSAP.
 */
export function movimento(normal: () => Limpeza, reduz?: () => Limpeza) {
  const mm = gsap.matchMedia()
  mm.add({ normal: QUERY_NORMAL, reduz: QUERY_REDUZ }, (ctx) =>
    ctx.conditions?.normal ? normal() : reduz?.()
  )
  return () => mm.revert()
}

/** Leitura pontual (fora de hooks de animação), por exemplo ao fechar diálogos. */
export function reduzMovimento(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(QUERY_REDUZ).matches
  )
}
