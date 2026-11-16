/** Durações (s) e curvas do app. Nada elástico nem com repique. */
export const DUR = {
  rapido: 0.15,
  base: 0.25,
  lento: 0.4,
  contagem: 0.6,
} as const

export const EASE = {
  saida: "power2.out",
  forte: "power3.out",
} as const

export const QUERY_NORMAL = "(prefers-reduced-motion: no-preference)"
export const QUERY_REDUZ = "(prefers-reduced-motion: reduce)"
