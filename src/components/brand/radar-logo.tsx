import { RadarMark } from "@/components/brand/radar-mark"
import { cn } from "@/lib/utils"

/**
 * Lockup: bloco amarelo com a marca + "Radar" + rótulo "WEETHUB" (12px, caixa
 * alta com tracking, tinta a 70%). É só texto: não reproduz o logotipo
 * "weethub" real. A caixa alta aqui faz parte do lockup da marca, não do UI.
 */
export function RadarLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 text-foreground", className)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-gray-900"><RadarMark className="size-7" /></span>
      <span className="flex flex-col gap-1 leading-none">
        <span className="text-[1.375rem] leading-none font-extrabold tracking-tight">
          Radar
        </span>
        <span className="text-xs font-bold tracking-[0.18em] text-foreground/70 uppercase">
          Weethub
        </span>
      </span>
    </span>
  )
}
