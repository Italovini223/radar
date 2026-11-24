import type { SVGProps } from "react"

/** Os 8 segmentos do anel (um por frente), em sentido horário a partir do topo. */
const SEGMENTOS = [
  "M25.15 2.03A22 22 0 0 1 38.72 7.65L33.03 13.97A13.5 13.5 0 0 0 24.71 10.52Z",
  "M40.35 9.28A22 22 0 0 1 45.97 22.85L37.48 23.29A13.5 13.5 0 0 0 34.03 14.97Z",
  "M45.97 25.15A22 22 0 0 1 40.35 38.72L34.03 33.03A13.5 13.5 0 0 0 37.48 24.71Z",
  "M38.72 40.35A22 22 0 0 1 25.15 45.97L24.71 37.48A13.5 13.5 0 0 0 33.03 34.03Z",
  "M22.85 45.97A22 22 0 0 1 9.28 40.35L14.97 34.03A13.5 13.5 0 0 0 23.29 37.48Z",
  "M7.65 38.72A22 22 0 0 1 2.03 25.15L10.52 24.71A13.5 13.5 0 0 0 13.97 33.03Z",
  "M2.03 22.85A22 22 0 0 1 7.65 9.28L13.97 14.97A13.5 13.5 0 0 0 10.52 23.29Z",
  "M9.28 7.65A22 22 0 0 1 22.85 2.03L23.29 10.52A13.5 13.5 0 0 0 14.97 13.97Z",
]

const TONS = {
  /** Sobre fundo claro: segmentos #c4c2ba e miolo em tinta. */
  claro: { segmento: "#c4c2ba", miolo: "#1c1c1a" },
  /** Sobre tinta (item ativo da dock): segmentos #4a4945 e miolo claro. */
  escuro: { segmento: "#4a4945", miolo: "#f3f2ef" },
} as const

/**
 * Marca do Radar: anel de 8 segmentos (as frentes) com o primeiro sempre em
 * amarelo Weethub (#fcbd20) e um ponto no centro. Geometria fixa (viewBox 48).
 * Fontes: public/brand/radar-mark.svg (claro) e radar-mark-small.svg (escuro).
 *
 * Decorativa por padrão; passe `title` para expor um nome acessível.
 */
export function RadarMark({
  title,
  tom = "claro",
  ...props
}: SVGProps<SVGSVGElement> & { title?: string; tom?: keyof typeof TONS }) {
  const cores = TONS[tom]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={32}
      height={32}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {SEGMENTOS.map((d, i) => (
        <path key={i} d={d} fill={i === 0 ? "#fcbd20" : cores.segmento} />
      ))}
      <circle cx="24" cy="24" r="3.2" fill={cores.miolo} />
    </svg>
  )
}
