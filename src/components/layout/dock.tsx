"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import { RotateCw } from "lucide-react"
import { toast } from "sonner"

import { RadarMark } from "@/components/brand/radar-mark"
import { Dica } from "@/components/ui/dica"
import { NAV_PRINCIPAL, estaAtivo } from "@/components/layout/nav-itens"
import { resumoCarteira } from "@/lib/domain/carteira"
import { dataCurta } from "@/lib/domain/rotulos"
import { useRadar } from "@/lib/hooks"
import { useRadarStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const BOTAO =
  "relative grid size-10 shrink-0 place-items-center rounded-full outline-none transition-[background-color,color,filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/**
 * Navegação em barra flutuante embaixo da tela (não é sidebar). Botões
 * redondos de 40px em `pill`; o ativo fica em tinta com ícone claro. O
 * contador coral em Clientes mostra quantos clientes têm alerta (sem alerta,
 * sem contador). O último botão recalcula os alertas, com o horário (ou a data
 * de referência) ao lado.
 * Ordem: Radar, Grade, Clientes, Check-up, Atualizar.
 */
export function Dock() {
  const pathname = usePathname()
  const { ready, situacoes, hoje, configuracao } = useRadar()
  const recalcularAgora = useRadarStore((s) => s.recalcularAgora)

  // Clientes com alerta = Crítico + Atenção (mesma conta do painel do Radar).
  const comAlerta = ready ? resumoCarteira(situacoes.values()).precisamAcao : 0
  const quando = !ready
    ? null
    : configuracao.usarHojeReal
      ? `hoje, ${format(hoje, "HH:mm")}`
      : `ref. ${dataCurta(configuracao.dataReferencia)}`

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:bottom-5">
      <nav
        aria-label="Principal"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-panel p-1.5 shadow-dock"
      >
        <ul className="flex items-center gap-1.5">
          {NAV_PRINCIPAL.map((item) => {
            const ativo = estaAtivo(pathname, item.href)
            const Icone = item.icone
            const ehRadar = item.href === "/radar"
            const contagem =
              item.href === "/clientes" && comAlerta > 0 ? comAlerta : undefined
            return (
              <li key={item.href}>
                <Dica
                  texto={
                    contagem !== undefined
                      ? `${item.dica} · ${contagem} com alerta`
                      : item.dica
                  }
                >
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  aria-label={
                    contagem !== undefined
                      ? `${item.label} (${contagem} ${contagem === 1 ? "cliente" : "clientes"} com alerta)`
                      : item.label
                  }
                  className={cn(
                    BOTAO,
                    ativo
                      ? "bg-ink text-on-ink"
                      : "bg-pill text-foreground hover:brightness-[.97]"
                  )}
                >
                  {ehRadar ? (
                    <RadarMark tom={ativo ? "escuro" : "claro"} className="size-[22px]" />
                  ) : (
                    <Icone className="size-[17px]" strokeWidth={1.6} aria-hidden />
                  )}
                  {contagem !== undefined ? (
                    <span
                      aria-hidden
                      className="tnum absolute -top-[3px] -right-[3px] grid h-4 min-w-4 place-items-center rounded-full bg-state-crit-bar px-1 text-[0.625rem] leading-none font-medium text-ink"
                    >
                      {contagem}
                    </span>
                  ) : null}
                </Link>
                </Dica>
              </li>
            )
          })}
          <li>
            <Dica texto="Recalcular alertas: atualiza alertas e prazos com os dados atuais">
            <button
              type="button"
              aria-label="Recalcular alertas"
              disabled={!ready}
              onClick={() => {
                recalcularAgora()
                toast.success(
                  configuracao.usarHojeReal
                    ? "Alertas recalculados com a data de hoje."
                    : "Alertas recalculados na data de referência."
                )
              }}
              className={cn(
                BOTAO,
                "bg-pill text-foreground hover:brightness-[.97] disabled:opacity-50"
              )}
            >
              <RotateCw className="size-[17px]" strokeWidth={1.6} aria-hidden />
            </button>
            </Dica>
          </li>
        </ul>
        {quando ? (
          <p
            className="legenda hidden pr-2.5 pl-1.5 sm:block"
            aria-live="polite"
          >
            Atualizado
            <br />
            <span className="tnum">{quando}</span>
          </p>
        ) : null}
      </nav>
    </div>
  )
}
