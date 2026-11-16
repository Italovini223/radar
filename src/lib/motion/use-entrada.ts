"use client"

import type { RefObject } from "react"

import { gsap, useGSAP } from "./gsap"
import { movimento } from "./movimento"
import { DUR, EASE } from "./tokens"

/**
 * Entrada de tela: os blocos marcados com `data-entra` dentro de `ref` sobem
 * 8 px e aparecem em sequência (0,04 s entre eles), uma vez por montagem.
 */
export function useEntrada(ref: RefObject<HTMLElement | null>) {
  useGSAP(
    () =>
      movimento(() => {
        const alvos = ref.current?.querySelectorAll("[data-entra]")
        if (!alvos?.length) return
        gsap.from(alvos, {
          autoAlpha: 0,
          y: 8,
          duration: DUR.lento,
          ease: EASE.saida,
          stagger: 0.04,
          clearProps: "opacity,visibility,transform",
        })
      }),
    { scope: ref }
  )
}
