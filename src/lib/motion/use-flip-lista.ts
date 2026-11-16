"use client"

import { useRef, type RefObject } from "react"

import { gsap, useGSAP } from "./gsap"
import { movimento } from "./movimento"
import { DUR, EASE } from "./tokens"

interface Medida {
  top: number
  left: number
  width: number
  node?: HTMLElement
}

function posicaoEm(raiz: HTMLElement, el: HTMLElement) {
  let top = 0
  let left = 0
  let n: HTMLElement | null = el
  while (n && n !== raiz) {
    top += n.offsetTop
    left += n.offsetLeft
    n = n.offsetParent as HTMLElement | null
  }
  return { top, left }
}

/**
 * Lista animada em estilo FLIP (First, Last, Invert, Play), só com
 * transform e opacidade. Itens são os elementos `[data-flip-id]` dentro de
 * `ref`. Quando `chave` (ids na ordem) muda: quem fica desliza do lugar antigo
 * para o novo, quem entra sobe 8 px e aparece, quem sai deixa um "fantasma"
 * que some em 0,25 s (só com `fantasmas`; a raiz precisa ser `position:
 * relative`). `destaqueEntrada` acende por um instante quem entrou.
 *
 * As posições vêm de offsetTop/Left (layout), então não dependem de rolagem
 * nem de transforms em andamento. Não anima na primeira montagem (isso é da
 * entrada da tela) e, com prefers-reduced-motion, só registra o novo estado.
 *
 * Observação: o plugin Flip do GSAP foi testado primeiro e descartado: ao
 * medir estados com itens sendo removidos pelo React e rolagem, ele terminava
 * em posições erradas (ver relatório).
 */
export function useFlipLista(
  ref: RefObject<HTMLElement | null>,
  chave: string,
  { fantasmas = false, destaqueEntrada = false } = {}
) {
  const ultimo = useRef<Map<string, Medida> | null>(null)

  useGSAP(
    () => {
      const raiz = ref.current
      if (!raiz) return
      const itens = Array.from(
        raiz.querySelectorAll<HTMLElement>("[data-flip-id]")
      )
      const anterior = ultimo.current
      const criados: HTMLElement[] = []

      // Registra o estado atual (layout) para a próxima mudança.
      const agora = new Map<string, Medida>()
      for (const el of itens) {
        agora.set(el.dataset.flipId ?? "", {
          width: el.offsetWidth,
          ...posicaoEm(raiz, el),
          node: fantasmas ? (el.cloneNode(true) as HTMLElement) : undefined,
        })
      }
      ultimo.current = agora

      const limpar = movimento(() => {
        if (!anterior) return
        const entraram: HTMLElement[] = []
        for (const el of itens) {
          const id = el.dataset.flipId ?? ""
          const antes = anterior.get(id)
          const depois = agora.get(id)
          if (!depois) continue
          if (!antes) {
            entraram.push(el)
            continue
          }
          const dx = antes.left - depois.left
          const dy = antes.top - depois.top
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
          gsap.fromTo(
            el,
            { x: dx, y: dy },
            {
              x: 0,
              y: 0,
              duration: 0.3,
              ease: EASE.saida,
              overwrite: "auto",
              clearProps: "transform",
            }
          )
        }
        if (entraram.length) {
          gsap.fromTo(
            entraram,
            { autoAlpha: 0, y: 8 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.3,
              ease: EASE.saida,
              clearProps: "opacity,visibility,transform",
              onComplete: () => {
                if (!destaqueEntrada) return
                gsap.fromTo(
                  entraram,
                  { backgroundColor: "rgba(244,243,234,1)" },
                  {
                    backgroundColor: "rgba(244,243,234,0)",
                    duration: 1.2,
                    clearProps: "backgroundColor",
                  }
                )
              },
            }
          )
        }
        if (fantasmas) {
          for (const [id, m] of anterior) {
            if (agora.has(id) || !m.node) continue
            const g = m.node
            g.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"))
            g.removeAttribute("data-flip-id")
            g.setAttribute("aria-hidden", "true")
            g.setAttribute("inert", "")
            Object.assign(g.style, {
              position: "absolute",
              top: `${m.top}px`,
              left: `${m.left}px`,
              width: `${m.width}px`,
              pointerEvents: "none",
              transform: "none",
              opacity: "1",
              visibility: "visible",
            })
            raiz.appendChild(g)
            criados.push(g)
            gsap.to(g, {
              autoAlpha: 0,
              y: -6,
              duration: DUR.base,
              ease: EASE.saida,
              onComplete: () => g.remove(),
            })
          }
        }
      })

      return () => {
        limpar()
        criados.forEach((g) => g.remove())
      }
    },
    { dependencies: [chave], scope: ref, revertOnUpdate: true }
  )
}
