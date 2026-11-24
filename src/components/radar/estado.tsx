import { cn } from "@/lib/utils"
import { ROTULO_SITUACAO } from "@/lib/domain/rotulos"
import type {
  EstadoFrente,
  SituacaoCliente,
  StatusFrente,
} from "@/lib/domain/types"

/**
 * Vocabulário visual dos estados. Regra: cor NUNCA vem sozinha: sempre com um
 * marcador de forma própria + texto. Triângulo = já estourou o prazo
 * (atrasada, crítica); bolinha = ainda não estourou (atenção, em dia). É o
 * mesmo marcador do radar, então quem olha a lista reconhece o ponto.
 */
export const ESTADOS: Record<
  EstadoFrente,
  {
    label: string
    descricao: string
    /** cor do texto do status (>= 4,5:1 sobre o painel) */
    texto: string
    /** cor do marcador e das barras */
    marcador: string
    /** fundo suave + texto + linha, para avisos em bloco */
    classe: string
  }
> = {
  em_dia: {
    label: "Em dia",
    descricao: "Menos de 75% do prazo",
    texto: "text-muted-foreground",
    marcador: "bg-state-ok-bar",
    classe: "bg-state-ok-soft text-state-ok border-state-ok-line",
  },
  atencao: {
    label: "Atenção",
    descricao: "Entre 75% e 100% do prazo (aviso, não gera alerta)",
    texto: "text-state-warn",
    marcador: "bg-state-warn-bar",
    classe: "bg-state-warn-soft text-state-warn border-state-warn-line",
  },
  atrasada: {
    label: "Atrasada",
    descricao: "Passou do prazo, antes de virar crítica",
    texto: "text-state-late",
    marcador: "bg-state-late-bar",
    classe: "bg-state-late-soft text-state-late border-state-late-line",
  },
  critica: {
    label: "Crítica",
    descricao: "Atingiu o limite \"vira crítico após\" da frente ou nunca teve ação",
    texto: "text-state-crit",
    marcador: "bg-state-crit-bar",
    classe: "bg-state-crit-soft text-state-crit border-state-crit-line",
  },
}

export function rotuloEstado(s: Pick<StatusFrente, "estado" | "nunca">): string {
  return s.nunca ? "Nunca" : ESTADOS[s.estado].label
}

/** Estourou o prazo? Então o marcador é triângulo. */
const ehTriangulo = (estado: EstadoFrente, nunca: boolean) =>
  nunca || estado === "atrasada" || estado === "critica"

/**
 * Marcador de dado (não é ícone decorativo): triângulo de 9px para atrasada,
 * crítica e "nunca"; bolinha de 7px para atenção e em dia. A cor vem do
 * estado (coral, laranja, amarelo, cinza), independente da cor do texto.
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
  const marcador = ESTADOS[nunca ? "critica" : estado].marcador
  return (
    <i
      aria-hidden
      data-marcador={ehTriangulo(estado, nunca) ? "triangulo" : "bolinha"}
      className={cn(
        "inline-block shrink-0 not-italic",
        ehTriangulo(estado, nunca)
          ? "size-[9px] [clip-path:polygon(50%_0,100%_100%,0_100%)]"
          : "size-[7px] rounded-full",
        marcador,
        className
      )}
    />
  )
}

/**
 * Status em texto: marcador + rótulo colorido, sem fundo e sem borda.
 * "Em dia" fica em cinza.
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
  const { texto, label } = ESTADOS[estado]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        nunca ? ESTADOS.critica.texto : texto,
        className
      )}
    >
      <EstadoGlyph estado={estado} nunca={nunca} />
      {nunca ? "Nunca teve ação" : label}
    </span>
  )
}

const ESTADO_DA_SITUACAO: Record<SituacaoCliente, EstadoFrente> = {
  critico: "critica",
  atencao: "atrasada",
  ok: "em_dia",
}

/**
 * Situação do cliente (Crítico / Atenção / Ok), no mesmo formato do status:
 * marcador + texto. Crítico = alguma frente crítica; Atenção = alguma
 * atrasada ou aprovação travada; Ok = nenhuma (avisos de "perto do prazo"
 * são permitidos).
 */
export function SituacaoBadge({
  situacao,
  className,
}: {
  situacao: SituacaoCliente
  className?: string
}) {
  const estado = ESTADO_DA_SITUACAO[situacao]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        ESTADOS[estado].texto,
        className
      )}
    >
      <EstadoGlyph estado={estado} />
      <span className="sr-only">Situação: </span>
      {ROTULO_SITUACAO[situacao]}
    </span>
  )
}
