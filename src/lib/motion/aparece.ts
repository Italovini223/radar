import { gsap } from "./gsap"
import { reduzMovimento } from "./movimento"
import { DUR, EASE } from "./tokens"

/**
 * Ref de função para confirmações inline: ao entrar no DOM, o elemento sobe
 * 4 px e aparece em 0,2 s. Sem movimento quando o usuário pediu menos.
 */
export function aoAparecer(el: HTMLElement | null) {
  if (!el || reduzMovimento()) return
  gsap.from(el, {
    autoAlpha: 0,
    y: 4,
    duration: DUR.base - 0.05,
    ease: EASE.saida,
    clearProps: "opacity,visibility,transform",
  })
}
