"use client"

import { useRef, type ReactNode } from "react"
import Link from "next/link"

import {
  ESTADOS,
  ESTADO_DA_SITUACAO,
  EstadoGlyph,
} from "@/components/radar/estado"
import { Dica } from "@/components/ui/dica"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { Numero } from "@/lib/motion/numero"
import { DUR, EASE } from "@/lib/motion/tokens"
import {
  emClientes,
  resumoCarteira,
  tituloCarteira,
} from "@/lib/domain/carteira"
import { formatarDias } from "@/lib/domain/opportunities"
import { ROTULO_SITUACAO } from "@/lib/domain/rotulos"
import type {
  EstadoFrente,
  Opportunity,
  SituacaoCliente,
  StatusFrente,
} from "@/lib/domain/types"
import { cn } from "@/lib/utils"

export type AbaRadar =
  | "todas"
  | "criticas"
  | "atrasadas"
  | "aprovacao"
  | "novas"

/**
 * Barra de CLIENTES por situação (não de pares cliente x frente). Marcador e
 * cor vêm da situação: Crítico (coral), Atenção (laranja), Ok (cinza).
 */
const SEGMENTOS: {
  situacao: SituacaoCliente
  /** Para o texto de leitor de tela: "3 críticos". */
  plural: string
}[] = [
  { situacao: "critico", plural: "críticos" },
  { situacao: "atencao", plural: "em atenção" },
  { situacao: "ok", plural: "ok" },
]

/** Últimas proporções mostradas: ao voltar para a tela, a barra parte delas. */
const memoriaBarra = new Map<string, number>()

/** Canto marcado (o mesmo da Grade): aprovação travada. */
function GlifoTravada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={12}
      height={12}
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect x="1.25" y="1.25" width="9.5" height="9.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1.25h5.75V7z" fill="currentColor" />
    </svg>
  )
}

function Kpi({
  rotulo,
  glifo,
  cor,
  corLinha,
  numero,
  apoio,
  selecionado,
  onClick,
  href,
  dataKpi,
  dica,
}: {
  rotulo: string
  glifo: ReactNode
  cor: string
  corLinha: string
  numero: number
  apoio: string
  selecionado?: boolean
  onClick?: () => void
  href?: string
  dataKpi: string
  dica: string
}) {
  const conteudo = (
    <>
      <span className="legenda flex items-center gap-1.5">
        {glifo}
        {rotulo}
      </span>
      <Numero
        valor={numero}
        chave={`kpi:${dataKpi}`}
        dataNumero={dataKpi}
        className={cn(
          "numero mt-1 block text-[2.125rem] leading-9",
          cor === "text-state-crit" ? cor : "text-foreground"
        )}
      />
      <span className="tnum legenda mt-1 block">
        {apoio}
      </span>
      <span
        aria-hidden
        data-sublinhado
        data-ativo={selecionado ? "true" : "false"}
        className={cn("absolute inset-x-0 bottom-0 h-0.5", corLinha)}
      />
    </>
  )
  const classes = cn(
    "relative block w-full px-5 py-4 text-left outline-none transition-colors hover:bg-panel-hi focus-visible:z-[1] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
    selecionado && "bg-accent"
  )
  return href ? (
    <Dica texto={dica}>
      <Link href={href} className={classes} data-kpi={dataKpi}>
        {conteudo}
      </Link>
    </Dica>
  ) : (
    <Dica texto={selecionado ? "Clique de novo para voltar a mostrar todas" : dica}>
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className={classes}
      data-kpi={dataKpi}
    >
      {conteudo}
    </button>
    </Dica>
  )
}

/**
 * Painel "Saúde da carteira": diz quantos CLIENTES precisam de ação, com uma
 * barra de clientes por situação (Crítico, Atenção, Ok), e 4 indicadores de
 * frentes ("em N clientes"). Críticas, atrasadas e aguardando aprovação
 * filtram a lista (clicar de novo volta para "todas"); "Perto do prazo" não
 * gera oportunidade, então leva à Grade.
 */
export function PainelSaude({
  grade,
  oportunidades,
  situacoes,
  ativa,
  onFiltrar,
}: {
  grade: StatusFrente[]
  oportunidades: Opportunity[]
  /** Situação de cada cliente ativo. */
  situacoes: ReadonlyMap<string, SituacaoCliente>
  ativa: AbaRadar
  onFiltrar: (a: AbaRadar) => void
}) {
  const resumo = resumoCarteira(situacoes.values())
  const titulo = tituloCarteira(resumo)
  const quantos: Record<SituacaoCliente, number> = {
    critico: resumo.criticos,
    atencao: resumo.atencao,
    ok: resumo.ok,
  }
  const contagens = SEGMENTOS.map((s) => ({ ...s, n: quantos[s.situacao] }))
  const pct = (n: number) =>
    resumo.total === 0 ? 0 : Math.round((n / resumo.total) * 100)

  const daFrente = (e: EstadoFrente) => grade.filter((g) => g.estado === e)
  const clientesDe = (lista: { clientId: string }[]) =>
    new Set(lista.map((g) => g.clientId)).size
  const criticas = daFrente("critica")
  const atrasadas = daFrente("atrasada")
  const pertoDoPrazo = daFrente("atencao")
  const travadas = oportunidades.filter((o) => o.tipo === "aprovacao")
  const maisAntiga = Math.max(0, ...travadas.map((o) => o.diasParado ?? 0))

  const resumoBarra = `Saúde da carteira: ${titulo.toLowerCase()}. ${contagens
    .map((s) => `${s.n} ${s.plural} (${pct(s.n)}%)`)
    .join(", ")}, de ${resumo.total} clientes.`

  const alternar = (a: AbaRadar) => onFiltrar(a === ativa ? "todas" : a)

  const raiz = useRef<HTMLElement>(null)
  const inicializado = useRef(false)

  // Barra: cada segmento cresce até a sua proporção (parte de 0 na primeira
  // vez e da última proporção mostrada nas seguintes). Largura é a única
  // propriedade de layout animada no app, de propósito: é o dado.
  const chaveBarra = contagens.map((s) => s.n).join("-")
  useGSAP(
    () =>
      movimento(
        () => {
          raiz.current
            ?.querySelectorAll<HTMLElement>("[data-segmento]")
            .forEach((el) => {
              const de = memoriaBarra.get(el.dataset.segmento ?? "") ?? 0
              gsap.fromTo(
                el,
                { flexGrow: de },
                { flexGrow: Number(el.dataset.n), duration: DUR.contagem, ease: EASE.saida }
              )
            })
        },
        () => undefined
      ),
    { dependencies: [chaveBarra], scope: raiz, revertOnUpdate: true }
  )
  // Guarda as proporções depois do efeito acima (e do ciclo duplo do React em
  // desenvolvimento, que senão leria o valor novo como se fosse o antigo).
  useGSAP(
    () => {
      const t = setTimeout(() => {
        for (const s of contagens) memoriaBarra.set(s.situacao, s.n)
      }, 0)
      return () => clearTimeout(t)
    },
    { dependencies: [chaveBarra] }
  )

  // Indicador selecionado: o sublinhado de 2 px desliza (scaleX).
  useGSAP(
    () => {
      const alvos = raiz.current?.querySelectorAll<HTMLElement>("[data-sublinhado]")
      if (!alvos?.length) return
      const escala = (_: number, el: Element) =>
        (el as HTMLElement).dataset.ativo === "true" ? 1 : 0
      const primeira = !inicializado.current
      inicializado.current = true
      gsap.set(alvos, { transformOrigin: "left center" })
      if (primeira) {
        gsap.set(alvos, { scaleX: escala })
        return
      }
      return movimento(
        () => {
          gsap.to(alvos, { scaleX: escala, duration: DUR.base, ease: EASE.saida })
        },
        () => {
          gsap.set(alvos, { scaleX: escala })
        }
      )
    },
    { dependencies: [ativa], scope: raiz }
  )

  return (
    <section
      ref={raiz}
      data-entra
      aria-labelledby="titulo-saude"
      className="rounded-lg bg-card"
    >
      <div className="px-4 pt-5 pb-5 sm:px-5">
        <h2 id="titulo-saude" className="mb-3 text-lg">
          <span className="legenda mb-0.5 block">Saúde da carteira</span>
          {titulo}
        </h2>

        <div
          role="img"
          aria-label={resumoBarra}
          data-barra-saude
          className="flex h-2.5 w-full gap-1"
        >
          {contagens
            .filter((s) => s.n > 0)
            .map((s) => (
              <span
                key={s.situacao}
                data-segmento={s.situacao}
                data-n={s.n}
                className={cn(
                  "block h-full rounded-full",
                  ESTADOS[ESTADO_DA_SITUACAO[s.situacao]].marcador
                )}
                style={{ flexGrow: s.n, flexBasis: 0 }}
              />
            ))}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {contagens.map((s) => (
            <li key={s.situacao} className="tnum flex items-center gap-1.5">
              <EstadoGlyph estado={ESTADO_DA_SITUACAO[s.situacao]} />
              <span className="text-muted-foreground">
                {ROTULO_SITUACAO[s.situacao]}
              </span>
              <span className="font-medium">{s.n}</span>
              <span className="text-muted-foreground">{pct(s.n)}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 border-t lg:grid-cols-4 [&>*]:border-b [&>*:nth-last-child(-n+2)]:border-b-0 lg:[&>*]:border-b-0 lg:[&>*:not(:first-child)]:border-l [&>*:nth-child(even)]:border-l">
        <Kpi
          dataKpi="criticas"
          rotulo="Críticas"
          glifo={<EstadoGlyph estado="critica" />}
          cor="text-state-crit"
          corLinha="bg-state-crit"
          numero={criticas.length}
          apoio={emClientes(clientesDe(criticas))}
          selecionado={ativa === "criticas"}
          dica="Filtrar a lista abaixo: só as críticas"
          onClick={() => alternar("criticas")}
        />
        <Kpi
          dataKpi="atrasadas"
          rotulo="Atrasadas"
          glifo={<EstadoGlyph estado="atrasada" />}
          cor="text-state-late"
          corLinha="bg-state-late"
          numero={atrasadas.length}
          apoio={emClientes(clientesDe(atrasadas))}
          selecionado={ativa === "atrasadas"}
          dica="Filtrar a lista abaixo: só as atrasadas"
          onClick={() => alternar("atrasadas")}
        />
        <Kpi
          dataKpi="atencao"
          rotulo={ESTADOS.atencao.label}
          glifo={<EstadoGlyph estado="atencao" />}
          cor="text-state-warn"
          corLinha="bg-state-warn"
          numero={pertoDoPrazo.length}
          apoio={emClientes(clientesDe(pertoDoPrazo))}
          href="/grade"
          dica="Ainda sem alerta: abrir a Grade para ver as frentes perto do prazo"
        />
        <Kpi
          dataKpi="aprovacao"
          rotulo="Aguardando aprovação"
          glifo={<GlifoTravada className="text-state-warn-bar" />}
          cor="text-state-warn"
          corLinha="bg-state-warn"
          numero={travadas.length}
          apoio={
            travadas.length === 0
              ? "nenhuma travada"
              : `${emClientes(clientesDe(travadas))} · mais antiga: ${formatarDias(maisAntiga)}`
          }
          selecionado={ativa === "aprovacao"}
          dica="Filtrar a lista abaixo: só as entregas aguardando aprovação"
          onClick={() => alternar("aprovacao")}
        />
      </div>
    </section>
  )
}
