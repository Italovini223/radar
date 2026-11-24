"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Settings } from "lucide-react"

import { RadarMark } from "@/components/brand/radar-mark"
import { Dica } from "@/components/ui/dica"
import { NAV_CONFIG, estaAtivo, secaoAtual } from "@/components/layout/nav-itens"
import { dataCurta } from "@/lib/domain/rotulos"
import { useRadar } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/**
 * Cabeçalho sobre o fundo cinza (sem barra branca): marca, nome da seção em
 * caixa normal (ou o caminho Clientes > Cliente na ficha), a pílula de dados
 * de demonstração e o acesso a Configurações. A navegação principal fica na
 * dock, embaixo.
 */
export function Topbar() {
  const pathname = usePathname()
  const { clients, configuracao } = useRadar()
  const [secao, id] = pathname.split("/").filter(Boolean)
  const aninhado = secao === "clientes" && !!id
  const nome = aninhado ? (clients.find((c) => c.id === id)?.nome ?? "Ficha") : ""
  const atual = secaoAtual(pathname)
  const emConfig = estaAtivo(pathname, NAV_CONFIG.href)

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 bg-background px-4 sm:px-8 lg:px-10">
      <Dica texto="Ir para o Radar" lado="bottom">
      <Link
        href="/radar"
        aria-label="Weethub Radar, ir para o Radar"
        className="-m-1 rounded-full p-1 outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        <RadarMark className="size-8" />
      </Link>
      </Dica>

      {aninhado ? (
        <nav aria-label="Você está em" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-lg">
            <li>
              <Dica texto="Voltar para a lista de clientes" lado="bottom">
              <Link
                href="/clientes"
                className="text-muted-foreground hover:underline"
              >
                Clientes
              </Link>
              </Dica>
            </li>
            <li aria-hidden className="text-muted-foreground">
              <ChevronRight className="size-4" />
            </li>
            <li className="truncate text-foreground" aria-current="page">
              {nome}
            </li>
          </ol>
        </nav>
      ) : (
        <p className="truncate text-lg text-foreground">
          {atual?.label ?? "Weethub Radar"}
        </p>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Dica
          texto="Clientes e ações são fictícios. Clique para trocar a data de referência ou resetar a demonstração."
          lado="bottom"
        >
        <Link
          href="/configuracoes"
          className="hidden h-[26px] items-center gap-[5px] rounded-full bg-pill px-[11px] text-xs whitespace-nowrap text-muted-foreground outline-none hover:brightness-[.97] focus-visible:outline-2 focus-visible:outline-ring sm:inline-flex"
        >
          <i aria-hidden className="size-[7px] rounded-full bg-state-warn-bar" />
          <b className="font-medium text-foreground">Dados de demonstração</b>
          {configuracao.usarHojeReal ? null : (
            <span className="tnum">· ref. {dataCurta(configuracao.dataReferencia)}</span>
          )}
        </Link>
        </Dica>
        <Dica texto={NAV_CONFIG.dica} lado="bottom">
        <Link
          href={NAV_CONFIG.href}
          aria-label={NAV_CONFIG.label}
          aria-current={emConfig ? "page" : undefined}
          className={cn(
            "grid size-10 place-items-center rounded-full outline-none transition-[background-color,filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            emConfig
              ? "bg-ink text-on-ink"
              : "bg-pill text-foreground hover:brightness-[.97]"
          )}
        >
          <Settings className="size-[17px]" strokeWidth={1.6} aria-hidden />
        </Link>
        </Dica>
      </div>
    </header>
  )
}
