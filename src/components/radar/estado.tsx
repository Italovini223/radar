import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ROTULO_SITUACAO } from "@/lib/domain/rotulos"
import type {
  EstadoFrente,
  SituacaoCliente,
  StatusFrente,
} from "@/lib/domain/types"

/**
 * Vocabulário visual dos estados. Regra: cor NUNCA vem sozinha: sempre com um
 * glifo de forma própria + texto (acessibilidade e impressão em P&B).
 */
export const ESTADOS: Record<
  EstadoFrente,
  {
    label: string
    descricao: string
    /** fundo suave + texto + linha, todos tokens semânticos */
    classe: string
  }
> = {
  em_dia: {
    label: "Em dia",
    descricao: "Menos de 75% do prazo",
    classe: "bg-state-ok-soft text-state-ok border-state-ok-line",
  },
  atencao: {
    label: "Atenção",
    descricao: "Entre 75% e 100% do prazo (aviso, não gera alerta)",
    classe: "bg-state-warn-soft text-state-warn border-state-warn-line",
  },
  atrasada: {
    label: "Atrasada",
    descricao: "Passou do prazo, antes de virar crítica",
    classe: "bg-state-late-soft text-state-late border-state-late-line",
  },
  critica: {
    label: "Crítica",
    descricao: "Atingiu o limite \"vira crítico após\" da frente ou nunca teve ação",
    classe: "bg-state-crit-soft text-state-crit border-state-crit-line",
  },
}

export function rotuloEstado(s: Pick<StatusFrente, "estado" | "nunca">): string {
  return s.nunca ? "Nunca" : ESTADOS[s.estado].label
}

/**
 * Glifo de dado (não é ícone decorativo): uma forma por estado, desenhada em
 * `currentColor`. Em dia = círculo cheio; atenção = meio círculo; atrasada =
 * anel; crítica = X; nunca = traço.
 */
export function EstadoGlyph({
  estado,
  nunca = false,
  className,
}: {
  estado: EstadoFrente
  nunca?: boolean
  className?: string
}) {
  const forma = nunca ? "nunca" : estado
  return (
    <svg
      viewBox="0 0 12 12"
      width={12}
      height={12}
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {forma === "em_dia" ? (
        <circle cx="6" cy="6" r="4.5" fill="currentColor" />
      ) : forma === "atencao" ? (
        <>
          <circle
            cx="6"
            cy="6"
            r="4.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M6 1.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />
        </>
      ) : forma === "atrasada" ? (
        <circle
          cx="6"
          cy="6"
          r="4.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
      ) : forma === "critica" ? (
        <path
          d="M2.5 2.5l7 7M9.5 2.5l-7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M2 6h8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

/**
 * Estado numa linha de tabela ou lista. Só atrasada e crítica ganham chip;
 * atenção é texto colorido com glifo; "em dia" é texto cinza simples.
 */
export function EstadoBadge({
  estado,
  nunca = false,
  className,
}: {
  estado: EstadoFrente
  nunca?: boolean
  className?: string
}) {
  const { classe, label } = ESTADOS[estado]
  if (estado === "em_dia") {
    return <span className={cn("text-muted-foreground", className)}>{label}</span>
  }
  if (estado === "atencao") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold text-state-warn",
          className
        )}
      >
        <EstadoGlyph estado={estado} />
        {label}
      </span>
    )
  }
  return (
    <Badge
      variant="outline"
      className={cn(classe, "font-semibold", className)}
    >
      <EstadoGlyph estado={estado} nunca={nunca} />
      {nunca ? "Nunca teve ação" : label}
    </Badge>
  )
}

const CLASSE_SITUACAO: Record<SituacaoCliente, { classe: string; glifo: EstadoFrente }> = {
  critico: { classe: ESTADOS.critica.classe, glifo: "critica" },
  atencao: { classe: ESTADOS.atrasada.classe, glifo: "atrasada" },
  ok: { classe: ESTADOS.em_dia.classe, glifo: "em_dia" },
}

/**
 * Situação do cliente (Crítico / Atenção / Ok), sempre com glifo + texto.
 * Crítico = alguma frente crítica; Atenção = alguma atrasada ou aprovação
 * travada; Ok = nenhuma (avisos de "perto do prazo" são permitidos).
 */
export function SituacaoBadge({
  situacao,
  className,
}: {
  situacao: SituacaoCliente
  className?: string
}) {
  const { classe, glifo } = CLASSE_SITUACAO[situacao]
  return (
    <Badge variant="outline" className={cn(classe, "font-semibold", className)}>
      <EstadoGlyph estado={glifo} />
      <span className="sr-only">Situação: </span>
      {ROTULO_SITUACAO[situacao]}
    </Badge>
  )
}
