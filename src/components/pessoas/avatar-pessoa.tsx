import { iniciais, type Pessoa } from "@/lib/domain/pessoas"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Tons neutros para o fundo do avatar. Cores de estado (coral, laranja,
 * amarelo) ficam fora: são reservadas a status. A cor segue a pessoa (hash do
 * id), nunca a posição na lista: a mesma pessoa tem o mesmo tom em qualquer
 * tela.
 */
const TONS = [
  "bg-pill text-ink",
  "bg-line text-ink",
  "bg-panel-hi text-ink",
  "bg-ink-2 text-on-ink",
  "bg-ink text-on-ink",
] as const

function tomDe(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return TONS[h % TONS.length]
}

const TAMANHOS = {
  sm: "size-7 text-[0.625rem]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
} as const

/** Avatar com as iniciais (não há foto: as pessoas vêm do campo responsável). */
export function AvatarPessoa({
  pessoa,
  tamanho = "md",
  alerta = false,
  className,
}: {
  pessoa: Pessoa
  tamanho?: keyof typeof TAMANHOS
  /** Anel coral: pessoa atrelada a uma demanda atrasada ou crítica. */
  alerta?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full font-medium ring-2 ring-card select-none",
        TAMANHOS[tamanho],
        tomDe(pessoa.id),
        alerta && "outline-2 outline-offset-1 outline-state-crit-bar",
        className
      )}
    >
      {iniciais(pessoa.nome)}
    </span>
  )
}

/**
 * Pilha de avatares (até `max`, depois "+N"), com o nome de cada pessoa no
 * tooltip e na leitura de tela.
 */
export function PilhaAvatares({
  pessoas,
  max = 3,
  tamanho = "sm",
  alerta = false,
}: {
  pessoas: Pessoa[]
  max?: number
  tamanho?: keyof typeof TAMANHOS
  alerta?: boolean
}) {
  if (pessoas.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const visiveis = pessoas.slice(0, max)
  const resto = pessoas.length - visiveis.length
  const nomes = pessoas
    .map((p) => (p.area ? `${p.nome} (${p.area})` : p.nome))
    .join(", ")
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`Responsáveis: ${nomes}`}
          className="inline-flex items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {visiveis.map((p, i) => (
            <AvatarPessoa
              key={p.id}
              pessoa={p}
              tamanho={tamanho}
              alerta={alerta && i === 0}
              className={i > 0 ? "-ml-2" : undefined}
            />
          ))}
          {resto > 0 ? (
            <span
              aria-hidden
              className={cn(
                "-ml-2 inline-grid place-items-center rounded-full bg-pill font-medium text-muted-foreground ring-2 ring-card",
                TAMANHOS[tamanho]
              )}
            >
              +{resto}
            </span>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>{nomes}</TooltipContent>
    </Tooltip>
  )
}
