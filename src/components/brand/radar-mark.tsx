import type { SVGProps } from "react"

/**
 * Marca do Radar. Geometria fixa (viewBox 48): anel r=17 com traço 10, setor
 * amarelo de 90°, ponteiro a 45° e pivô. Anel, ponteiro e pivô seguem
 * `currentColor`; o setor é sempre #fcbd20. Fonte: public/brand/radar-mark.svg.
 *
 * `pequena` é a versão para tamanhos abaixo de 24px: ponteiro mais grosso
 * (traço 3,6) e sem pivô, que viraria borrão. Mesma construção, só menos detalhe.
 *
 * Decorativa por padrão; passe `title` para expor um nome acessível.
 */
export function RadarMark({
  title,
  pequena = false,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string; pequena?: boolean }) {
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
      <circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
      />
      <path fill="#fcbd20" d="M24 2A22 22 0 0 1 46 24H36A12 12 0 0 0 24 12Z" />
      <path
        d="M24 24L31.5 16.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={pequena ? 3.6 : 2.6}
        strokeLinecap="round"
      />
      {pequena ? null : <circle cx="24" cy="24" r="3.4" fill="currentColor" />}
    </svg>
  )
}
