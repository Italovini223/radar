import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import { DUR, EASE } from "./tokens"

// Registro único. Todo uso de gsap fica dentro de hooks (useGSAP/efeitos),
// então nada roda durante a renderização no servidor.
gsap.registerPlugin(useGSAP)
gsap.defaults({ duration: DUR.base, ease: EASE.saida })

export { gsap, useGSAP }
