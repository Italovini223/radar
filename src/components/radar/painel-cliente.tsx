"use client"

import { useId, useRef, useState, type ReactNode, type RefObject } from "react"

import { AvatarPessoa } from "@/components/pessoas/avatar-pessoa"
import { ESTADOS } from "@/components/radar/estado"
import { nomeCurtoFrente } from "@/lib/domain/frentes"
import { formatarDias } from "@/lib/domain/opportunities"
import {
  acoesPorPessoa,
  acoesPorStatus,
  atividadeSemanal,
  saudeDoCliente,
  usoDoPrazo,
} from "@/lib/domain/pessoas"
import { dataCurta } from "@/lib/domain/rotulos"
import type { Acao, EstadoFrente, Frente, StatusFrente } from "@/lib/domain/types"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { Numero } from "@/lib/motion/numero"
import { DUR, EASE } from "@/lib/motion/tokens"
import { cn } from "@/lib/utils"

/* Cores de marca dos gráficos: tokens do guia. Status só em dado de status. */
const COR_ESTADO: Record<EstadoFrente, string> = {
  critica: "var(--state-crit-bar)",
  atrasada: "var(--state-late-bar)",
  atencao: "var(--state-warn-bar)",
  em_dia: "var(--state-ok-bar)",
}

/* ---------- peças comuns ---------- */

function Cartao({
  titulo,
  legenda,
  children,
  className,
  extra,
}: {
  titulo: string
  legenda?: ReactNode
  children: ReactNode
  className?: string
  extra?: ReactNode
}) {
  return (
    <section data-entra className={cn("flex min-w-0 flex-col rounded-lg bg-card p-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug">{titulo}</h3>
          {legenda ? <p className="legenda mt-0.5">{legenda}</p> : null}
        </div>
        {extra}
      </div>
      {children}
    </section>
  )
}

/** Dica flutuante posicionada em % do gráfico (x, y do topo-esquerda). */
function Dica({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-on-ink shadow-pop"
      style={{ left: `${x}%`, top: `calc(${y}% - 8px)` }}
    >
      {children}
    </div>
  )
}

function Legenda({ itens }: { itens: { cor: string; rotulo: string; valor?: ReactNode }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {itens.map((i) => (
        <li key={i.rotulo} className="inline-flex items-center gap-1.5 text-muted-foreground">
          <i aria-hidden className="size-2 rounded-full" style={{ background: i.cor }} />
          {i.rotulo}
          {i.valor !== undefined ? (
            <b className="tnum font-medium text-foreground">{i.valor}</b>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Ponto na circunferência; ângulo em graus, 0 = direita, sentido anti-horário. */
function polar(cx: number, cy: number, r: number, graus: number) {
  const a = (graus * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
}

/** Arco (traço) de `de` até `ate` graus, no sentido horário visual. */
function arco(cx: number, cy: number, r: number, de: number, ate: number) {
  const a = polar(cx, cy, r, de)
  const b = polar(cx, cy, r, ate)
  const grande = Math.abs(de - ate) > 180 ? 1 : 0
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${r} ${r} 0 ${grande} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

/* ---------- 1. Saúde (medidor) ---------- */

const FAIXAS = [
  { de: 0, ate: 50, cor: "var(--state-crit-bar)" },
  { de: 50, ate: 80, cor: "var(--state-late-bar)" },
  { de: 80, ate: 100, cor: "var(--ok)" },
]

function Saude({ linhas }: { linhas: StatusFrente[] }) {
  const pct = saudeDoCliente(linhas)
  const ok = linhas.filter((l) => l.estado === "em_dia" || l.estado === "atencao").length
  const rotulo = pct >= 80 ? "Boa" : pct >= 50 ? "Atenção" : "Crítica"
  const texto =
    pct >= 80 ? "text-state-ok" : pct >= 50 ? ESTADOS.atrasada.texto : ESTADOS.critica.texto
  const cx = 100
  const cy = 96
  const r = 78
  const grau = (p: number) => 180 - p * 1.8
  const ponta = polar(cx, cy, r - 18, grau(pct))
  return (
    <Cartao titulo="Saúde" legenda="Frentes sem atraso">
      <figure className="flex flex-1 flex-col items-center justify-end">
        <svg
          viewBox="0 0 200 112"
          className="w-full max-w-60"
          role="img"
          aria-label={`Saúde do cliente: ${pct}% (${rotulo}). ${ok} de ${linhas.length} frentes sem atraso.`}
        >
          {FAIXAS.map((f) => (
            <path
              key={f.de}
              data-arco
              pathLength={100}
              d={arco(cx, cy, r, grau(f.de) - (f.de === 0 ? 0 : 1), grau(f.ate) + (f.ate === 100 ? 0 : 1))}
              fill="none"
              stroke={f.cor}
              strokeWidth={10}
              strokeLinecap="butt"
              opacity={pct >= f.de && (pct < f.ate || f.ate === 100) ? 1 : 0.35}
            />
          ))}
          <line
            data-ponteiro={pct}
            x1={cx}
            y1={cy}
            x2={ponta.x}
            y2={ponta.y}
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={5} fill="var(--ink)" stroke="var(--card)" strokeWidth={2} />
        </svg>
        <figcaption className="mt-1 text-center">
          <span className="numero block text-[2.125rem] leading-9">
            <Numero valor={pct} chave={`saude:${linhas[0]?.clientId ?? ""}`} />
            <small>%</small>
          </span>
          <span className={cn("text-xs font-medium", texto)}>{rotulo}</span>
          <span className="legenda tnum block">
            {ok} de {linhas.length} frentes
          </span>
        </figcaption>
      </figure>
    </Cartao>
  )
}

/* ---------- 2. Ações por status (rosca) ---------- */

const STATUS_ACAO = [
  { chave: "concluida", rotulo: "Concluídas", cor: "var(--ink)" },
  { chave: "em_andamento", rotulo: "Em andamento", cor: "var(--ink-3)" },
  { chave: "aguardando_aprovacao", rotulo: "Aguardando aprovação", cor: "var(--state-warn-bar)" },
] as const

function AcoesStatus({ acoes, clienteId }: { acoes: Acao[]; clienteId: string }) {
  const contagem = acoesPorStatus(acoes, clienteId)
  const total = STATUS_ACAO.reduce((s, x) => s + contagem[x.chave], 0)
  const [ativo, setAtivo] = useState<string | null>(null)
  const r = 15.9155 // circunferência = 100
  const comValor = STATUS_ACAO.filter((s) => contagem[s.chave] > 0)
  const pctDe = (s: (typeof STATUS_ACAO)[number]) =>
    (contagem[s.chave] / Math.max(1, total)) * 100
  const segmentos = comValor.map((s, k) => ({
    ...s,
    n: contagem[s.chave],
    pct: pctDe(s),
    inicio: comValor.slice(0, k).reduce((soma, x) => soma + pctDe(x), 0),
  }))
  const lacuna = segmentos.length > 1 ? 1.2 : 0
  return (
    <Cartao titulo="Ações" legenda="Por situação, desde o início">
      <div className="flex flex-1 items-center justify-center">
        <svg
          viewBox="0 0 42 42"
          className="size-40"
          role="img"
          aria-label={`${total} ações: ${segmentos.map((s) => `${s.n} ${s.rotulo.toLowerCase()}`).join(", ")}.`}
        >
          <circle cx="21" cy="21" r={r} fill="none" stroke="var(--pill)" strokeWidth="4.2" />
          {segmentos.map((s) => (
            <circle
              key={s.chave}
              data-rosca
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={s.cor}
              strokeWidth={ativo === s.chave ? 5.2 : 4.2}
              strokeDasharray={`${Math.max(0, s.pct - lacuna)} ${100 - Math.max(0, s.pct - lacuna)}`}
              strokeDashoffset={25 - s.inicio}
              className="cursor-default transition-[stroke-width]"
              onMouseEnter={() => setAtivo(s.chave)}
              onMouseLeave={() => setAtivo(null)}
            >
              <title>{`${s.rotulo}: ${s.n}`}</title>
            </circle>
          ))}
          <text x="21" y="21" textAnchor="middle" dominantBaseline="central" className="numero" style={{ fontSize: 9, fill: "var(--ink)" }}>
            {ativo ? contagem[ativo as keyof typeof contagem] : total}
          </text>
          <text x="21" y="28.5" textAnchor="middle" style={{ fontSize: 2.6, fill: "var(--ink-2)" }}>
            {ativo ? STATUS_ACAO.find((s) => s.chave === ativo)?.rotulo.toLowerCase() : "ações"}
          </text>
        </svg>
      </div>
      <Legenda itens={STATUS_ACAO.map((s) => ({ cor: s.cor, rotulo: s.rotulo, valor: contagem[s.chave] }))} />
    </Cartao>
  )
}

/* ---------- 3. Atividade (linha) ---------- */

function Atividade({ acoes, clienteId, hoje }: { acoes: Acao[]; clienteId: string; hoje: Date }) {
  const serie = atividadeSemanal(acoes, clienteId, hoje, 12)
  const gradiente = useId()
  const [i, setI] = useState<number | null>(null)
  const W = 600
  const H = 160
  const topo = 12
  const base = H - 4
  const max = Math.max(2, ...serie.map((s) => s.acoes))
  const x = (k: number) => (k / (serie.length - 1)) * W
  const y = (v: number) => base - (v / max) * (base - topo)
  const linha = serie.map((s, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)} ${y(s.acoes).toFixed(1)}`).join("")
  const area = `${linha}L${W} ${base}L0 ${base}Z`
  const total = serie.reduce((s, w) => s + w.acoes, 0)
  return (
    <Cartao
      titulo="Atividade"
      legenda="Ações registradas por semana, últimas 12 semanas"
      className="lg:col-span-2"
      extra={
        <p className="text-right">
          <Numero
            valor={total}
            chave={`atividade:${clienteId}`}
            className="numero block text-[1.75rem] leading-8"
          />
          <span className="legenda">no período</span>
        </p>
      }
    >
      <div className="grid flex-1 grid-cols-[1.25rem_1fr] gap-x-2">
        <div className="legenda tnum flex flex-col justify-between pb-6 text-right" aria-hidden>
          <span>{max}</span>
          <span>0</span>
        </div>
        <div>
          <div className="relative" onMouseLeave={() => setI(null)}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="block h-40 w-full overflow-visible"
              role="img"
              aria-label={`Ações por semana: ${serie.map((s) => `semana de ${s.rotulo}, ${s.acoes}`).join("; ")}.`}
            >
              <defs>
                <clipPath id={`${gradiente}-revela`}>
                  <rect data-revela x="-4" y="-4" width={W + 8} height={H + 8} />
                </clipPath>
                <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--ink)" stopOpacity="0.14" />
                  <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" x2={W} y1={base} y2={base} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <g clipPath={`url(#${gradiente}-revela)`}>
              <path d={area} fill={`url(#${gradiente})`} />
              <path d={linha} fill="none" stroke="var(--ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </g>
              {i !== null ? (
                <line x1={x(i)} x2={x(i)} y1={topo} y2={base} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              ) : null}
              {serie.map((s, k) => (
                <rect
                  key={s.inicio}
                  x={x(k) - W / serie.length / 2}
                  y={0}
                  width={W / serie.length}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setI(k)}
                />
              ))}
            </svg>
            {i !== null ? (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full border-2 border-card bg-ink"
                  style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(serie[i].acoes) / H) * 100}%` }}
                />
                <Dica x={(x(i) / W) * 100} y={(y(serie[i].acoes) / H) * 100}>
                  Semana de {serie[i].rotulo}: <b className="font-medium">{serie[i].acoes}</b>{" "}
                  {serie[i].acoes === 1 ? "ação" : "ações"}
                </Dica>
              </>
            ) : null}
          </div>
          <div className="legenda tnum mt-1.5 flex justify-between" aria-hidden>
            {serie.map((s, k) => (
              <span key={s.inicio} className={k % 3 === 0 || k === serie.length - 1 ? "" : "invisible"}>
                {s.rotulo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Cartao>
  )
}

/* ---------- 4. Uso do prazo por frente (barras de status) ---------- */

function UsoPrazo({ linhas, frentePorId }: { linhas: StatusFrente[]; frentePorId: Map<string, Frente> }) {
  const dados = usoDoPrazo(linhas)
  const [i, setI] = useState<number | null>(null)
  return (
    <Cartao
      titulo="Uso do prazo por frente"
      legenda="Dias desde a última ação ÷ prazo da frente (até 2×)"
      className="lg:col-span-2"
    >
      <div className="grid flex-1 grid-cols-[1.5rem_1fr] gap-x-2">
        <div className="legenda tnum relative h-44" aria-hidden>
          <span className="absolute top-0 right-0 -translate-y-1/2">2×</span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2">1×</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="min-w-0">
          <div className="relative h-44 border-b" onMouseLeave={() => setI(null)}>
            <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink-3" />
            <span aria-hidden className="legenda absolute top-1/2 right-0 -translate-y-full pb-0.5">
              prazo
            </span>
            <ul className="absolute inset-0 flex items-end gap-2">
              {dados.map((d, k) => {
                const f = frentePorId.get(d.frenteId)
                const cor = d.nunca ? COR_ESTADO.critica : COR_ESTADO[d.estado]
                const valor = d.nunca || d.dias === null ? "nunca teve ação" : `${formatarDias(d.dias)} de ${d.prazoDias} dias`
                return (
                  <li
                    key={d.frenteId}
                    className="flex h-full flex-1 items-end"
                    onMouseEnter={() => setI(k)}
                    aria-label={`${f ? nomeCurtoFrente(f) : d.frenteId}: ${valor} (${ESTADOS[d.nunca ? "critica" : d.estado].label})`}
                  >
                    <span
                      data-barra
                      className={cn("block w-full rounded-t-[4px] border-t-2 transition-opacity", i !== null && i !== k && "opacity-40")}
                      style={{
                        height: `${Math.max(1, (d.uso / 2) * 100)}%`,
                        borderColor: cor,
                        background: `linear-gradient(color-mix(in srgb, ${cor} 40%, transparent), transparent)`,
                      }}
                    />
                  </li>
                )
              })}
            </ul>
            {i !== null ? (
              <Dica x={((i + 0.5) / dados.length) * 100} y={100 - (dados[i].uso / 2) * 100}>
                {(() => {
                  const d = dados[i]
                  const f = frentePorId.get(d.frenteId)
                  return (
                    <>
                      {f ? nomeCurtoFrente(f) : d.frenteId}:{" "}
                      <b className="font-medium">
                        {d.nunca || d.dias === null
                          ? "nunca teve ação"
                          : `${formatarDias(d.dias)} de ${d.prazoDias}`}
                      </b>{" "}
                      · {ESTADOS[d.nunca ? "critica" : d.estado].label}
                    </>
                  )
                })()}
              </Dica>
            ) : null}
          </div>
          <div className="mt-1.5 flex gap-2" aria-hidden>
            {dados.map((d) => {
              const f = frentePorId.get(d.frenteId)
              return (
                <span key={d.frenteId} className="legenda min-w-0 flex-1 truncate text-center" title={f?.nome}>
                  {f ? nomeCurtoFrente(f) : d.frenteId}
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <Legenda
        itens={(["critica", "atrasada", "atencao", "em_dia"] as const).map((e) => ({
          cor: COR_ESTADO[e],
          rotulo: ESTADOS[e].label,
        }))}
      />
    </Cartao>
  )
}

/* ---------- 5. Ações por pessoa (barras empilhadas) ---------- */

function PorPessoa({ acoes, clienteId }: { acoes: Acao[]; clienteId: string }) {
  const dados = acoesPorPessoa(acoes, clienteId).slice(0, 8)
  const [i, setI] = useState<number | null>(null)
  const max = Math.max(1, ...dados.map((d) => d.concluidas + d.abertas))
  return (
    <Cartao titulo="Ações por pessoa" legenda="Quem mais atuou neste cliente" className="lg:col-span-2">
      {dados.length === 0 ? (
        <p className="flex flex-1 items-center text-sm text-muted-foreground">
          Nenhuma ação com responsável registrado.
        </p>
      ) : (
        <>
          <div className="relative h-44 border-b" onMouseLeave={() => setI(null)}>
            <ul className="absolute inset-0 flex items-end justify-around gap-3">
              {dados.map((d, k) => {
                const total = d.concluidas + d.abertas
                return (
                  <li
                    key={d.pessoa.id}
                    className="flex h-full w-full max-w-10 flex-col justify-end"
                    onMouseEnter={() => setI(k)}
                    aria-label={`${d.pessoa.nome}: ${d.concluidas} concluídas, ${d.abertas} abertas`}
                  >
                    <span
                      data-barra
                      className={cn("flex flex-col gap-0.5 transition-opacity", i !== null && i !== k && "opacity-40")}
                      style={{ height: `${(total / max) * 100}%` }}
                    >
                      {d.abertas > 0 ? (
                        <span className="block rounded-t-[4px] bg-ink-3" style={{ flexGrow: d.abertas }} />
                      ) : null}
                      {d.concluidas > 0 ? (
                        <span
                          className={cn("block bg-ink", d.abertas === 0 && "rounded-t-[4px]")}
                          style={{ flexGrow: d.concluidas }}
                        />
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
            {i !== null ? (
              <Dica
                x={((i + 0.5) / dados.length) * 100}
                y={100 - ((dados[i].concluidas + dados[i].abertas) / max) * 100}
              >
                {dados[i].pessoa.nome}: <b className="font-medium">{dados[i].concluidas}</b> concluídas
                {dados[i].abertas > 0 ? (
                  <>
                    , <b className="font-medium">{dados[i].abertas}</b> abertas
                  </>
                ) : null}
              </Dica>
            ) : null}
          </div>
          <div className="mt-2 flex justify-around gap-3" aria-hidden>
            {dados.map((d) => (
              <span key={d.pessoa.id} className="flex w-full max-w-10 flex-col items-center gap-1" title={d.pessoa.nome}>
                <AvatarPessoa pessoa={d.pessoa} tamanho="sm" />
                <span className="legenda w-full truncate text-center">{d.pessoa.nome}</span>
              </span>
            ))}
          </div>
          <Legenda
            itens={[
              { cor: "var(--ink)", rotulo: "Concluídas" },
              { cor: "var(--ink-3)", rotulo: "Abertas" },
            ]}
          />
        </>
      )}
    </Cartao>
  )
}

/* ---------- animação da primeira carga ---------- */

/**
 * Na montagem (primeira vez que o painel aparece): os arcos do medidor se
 * desenham e o ponteiro gira até o valor, os segmentos da rosca se preenchem
 * em sequência, a linha de atividade é revelada da esquerda para a direita e
 * as barras crescem a partir da base. A entrada dos cartões vem do
 * `useEntrada` da ficha (`data-entra`); aqui tudo começa logo depois dela.
 * Atualizações de dado depois disso não reanimam. Com movimento reduzido,
 * nada anima.
 */
function useAnimacaoInicial(raiz: RefObject<HTMLElement | null>) {
  useGSAP(
    () =>
      movimento(() => {
        const el = raiz.current
        if (!el) return
        const atraso = 0.2
        const tl = gsap.timeline({ delay: atraso, defaults: { ease: EASE.forte } })

        // Arcos com pathLength=100: o traço cresce de 0 a 100.
        el.querySelectorAll<SVGPathElement>("[data-arco]").forEach((arcoEl, k) => {
          tl.fromTo(
            arcoEl,
            { attr: { "stroke-dasharray": "0 100" } },
            { attr: { "stroke-dasharray": "100 0" }, duration: DUR.lento },
            k * 0.12
          )
        })
        const ponteiro = el.querySelector<SVGLineElement>("[data-ponteiro]")
        if (ponteiro) {
          const pct = Number(ponteiro.dataset.ponteiro ?? 0)
          tl.from(
            ponteiro,
            { rotation: -pct * 1.8, svgOrigin: "100 96", duration: 0.9, clearProps: "transform" },
            0.1
          )
        }

        el.querySelectorAll<SVGCircleElement>("[data-rosca]").forEach((seg, k) => {
          tl.from(
            seg,
            { attr: { "stroke-dasharray": "0 100" }, duration: DUR.contagem },
            0.1 + k * 0.15
          )
        })

        const revela = el.querySelector("[data-revela]")
        if (revela) {
          tl.from(revela, { attr: { width: 0 }, duration: 0.9, ease: EASE.saida }, 0.15)
        }

        const barras = el.querySelectorAll("[data-barra]")
        if (barras.length) {
          tl.from(
            barras,
            {
              scaleY: 0,
              transformOrigin: "50% 100%",
              duration: DUR.contagem,
              stagger: 0.05,
              clearProps: "transform",
            },
            0.2
          )
        }
      }),
    { scope: raiz }
  )
}

/* ---------- painel ---------- */

/**
 * Painel do cliente: saúde, ações, atividade, uso do prazo por frente e
 * ações por pessoa. Tudo derivado dos dados já carregados (sem chamadas
 * novas). Cor de estado só no gráfico de prazo, que é dado de estado.
 */
export function PainelCliente({
  clienteId,
  linhas,
  acoes,
  hoje,
  frentePorId,
  ultimaAcao,
}: {
  clienteId: string
  linhas: StatusFrente[]
  acoes: Acao[]
  hoje: Date
  frentePorId: Map<string, Frente>
  ultimaAcao?: string
}) {
  const raiz = useRef<HTMLElement>(null)
  useAnimacaoInicial(raiz)
  return (
    <section ref={raiz} aria-labelledby="titulo-painel" className="mb-8">
      <div data-entra className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-painel" className="text-xl">
          Painel do cliente
        </h2>
        {ultimaAcao ? (
          <p className="legenda tnum">Última ação registrada em {dataCurta(ultimaAcao)}</p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Saude linhas={linhas} />
        <AcoesStatus acoes={acoes} clienteId={clienteId} />
        <Atividade acoes={acoes} clienteId={clienteId} hoje={hoje} />
        <UsoPrazo linhas={linhas} frentePorId={frentePorId} />
        <PorPessoa acoes={acoes} clienteId={clienteId} />
      </div>
    </section>
  )
}
