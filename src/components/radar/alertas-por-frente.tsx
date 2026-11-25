"use client"

import { useRef } from "react"

import { EstadoGlyph } from "@/components/radar/estado"
import { alertasPorFrente } from "@/lib/domain/carteira"
import { nomeCurtoFrente } from "@/lib/domain/frentes"
import { ROTULO_ESTADO_FRENTE } from "@/lib/domain/rotulos"
import type { Frente, StatusFrente } from "@/lib/domain/types"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { DUR, EASE } from "@/lib/motion/tokens"

/** Última largura (% do trilho) mostrada por frente: a barra parte dela. */
const memoriaBarras = new Map<string, number>()

const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`

/**
 * Gráfico "Alertas por frente": uma barra horizontal por frente com crítica e
 * atrasada empilhadas e o total à direita. É a mesma conta da linha
 * "Problemas" da Grade (`alertasPorFrente`): atrasadas + críticas; aprovação
 * travada não entra. Frentes sem alerta saem das barras e ficam numa linha
 * ao fim. A entrada anima só `transform` (scaleX) e respeita
 * prefers-reduced-motion.
 */
export function AlertasPorFrente({
  grade,
  frentes,
}: {
  grade: StatusFrente[]
  frentes: Frente[]
}) {
  const dados = alertasPorFrente(grade, frentes)
  const comAlerta = dados.filter((d) => d.total > 0)
  const semAlerta = dados.filter((d) => d.total === 0)
  const maximo = Math.max(1, ...comAlerta.map((d) => d.total))
  const total = comAlerta.reduce((s, d) => s + d.total, 0)

  const resumo =
    comAlerta.length === 0
      ? "Alertas por frente: nenhuma frente com alerta."
      : `Alertas por frente, ${plural(total, "alerta", "alertas")} no total: ${comAlerta
          .map(
            (d) =>
              `${nomeCurtoFrente(d.frente)} ${d.total} (${plural(d.criticas, "crítica", "críticas")}, ${plural(d.atrasadas, "atrasada", "atrasadas")})`
          )
          .join("; ")}.${
          semAlerta.length
            ? ` Sem alertas: ${semAlerta.map((d) => nomeCurtoFrente(d.frente)).join(", ")}.`
            : ""
        }`

  const raiz = useRef<HTMLElement>(null)
  const chave = comAlerta
    .map((d) => `${d.frente.id}:${d.criticas}:${d.atrasadas}`)
    .join("|")

  // Cada barra cresce da esquerda: da largura anterior (ou de 0) até a atual.
  // Só transform: a largura final já está no CSS, o scaleX inicial é a razão.
  useGSAP(
    () =>
      movimento(
        () => {
          const barras = raiz.current?.querySelectorAll<HTMLElement>("[data-barra]")
          if (!barras?.length) return
          gsap.set(barras, { transformOrigin: "left center" })
          barras.forEach((el, i) => {
            const id = el.dataset.barra ?? ""
            const agora = Number(el.dataset.pct)
            const antes = memoriaBarras.get(id) ?? 0
            const de = agora > 0 ? Math.min(antes / agora, 1) : 1
            gsap.fromTo(
              el,
              { scaleX: de },
              {
                scaleX: 1,
                duration: DUR.contagem,
                ease: EASE.saida,
                delay: 0.05 + i * 0.04,
                clearProps: "transform",
              }
            )
          })
        },
        () => undefined
      ),
    { dependencies: [chave], scope: raiz, revertOnUpdate: true }
  )
  // Guarda as larguras depois do efeito acima (e do ciclo duplo do React em
  // desenvolvimento, que senão leria o valor novo como se fosse o antigo).
  useGSAP(
    () => {
      const t = setTimeout(() => {
        memoriaBarras.clear()
        for (const d of comAlerta) {
          memoriaBarras.set(d.frente.id, (d.total / maximo) * 100)
        }
      }, 0)
      return () => clearTimeout(t)
    },
    { dependencies: [chave] }
  )

  return (
    <section
      ref={raiz}
      data-entra
      data-alertas-por-frente
      aria-labelledby="titulo-alertas-frente"
      className="flex flex-col rounded-lg bg-card px-4 py-5 sm:px-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-alertas-frente" className="text-lg">
          Alertas por frente
        </h2>
        <p className="flex items-center gap-x-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <EstadoGlyph estado="critica" />
            {ROTULO_ESTADO_FRENTE.critica}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <EstadoGlyph estado="atrasada" />
            {ROTULO_ESTADO_FRENTE.atrasada}
          </span>
        </p>
      </div>

      {comAlerta.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="img" aria-label={resumo}>
          Nenhuma frente com alerta.
        </p>
      ) : (
        <ul
          role="img"
          aria-label={resumo}
          className="flex flex-col gap-2.5"
          data-total={total}
        >
          {comAlerta.map((d) => (
            <li
              key={d.frente.id}
              data-frente={d.frente.id}
              data-total={d.total}
              data-criticas={d.criticas}
              data-atrasadas={d.atrasadas}
              className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_1.5rem] items-center gap-x-3 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_1.5rem]"
            >
              <span className="truncate" title={d.frente.nome}>
                {nomeCurtoFrente(d.frente)}
              </span>
              <span className="flex h-2.5 min-w-0 items-center">
                <span
                  data-barra={d.frente.id}
                  data-pct={(d.total / maximo) * 100}
                  className="flex h-full gap-0.5"
                  style={{ width: `${(d.total / maximo) * 100}%` }}
                >
                  {d.criticas > 0 ? (
                    <span
                      className="block h-full rounded-full bg-state-crit-bar"
                      style={{ flexGrow: d.criticas, flexBasis: 0 }}
                    />
                  ) : null}
                  {d.atrasadas > 0 ? (
                    <span
                      className="block h-full rounded-full bg-state-late-bar"
                      style={{ flexGrow: d.atrasadas, flexBasis: 0 }}
                    />
                  ) : null}
                </span>
              </span>
              <span className="tnum text-right font-medium">{d.total}</span>
            </li>
          ))}
        </ul>
      )}

      {semAlerta.length > 0 && comAlerta.length > 0 ? (
        <p className="legenda mt-3">
          Sem alertas: {semAlerta.map((d) => nomeCurtoFrente(d.frente)).join(", ")}
        </p>
      ) : null}
      <p className="legenda mt-auto pt-3">
        Mesma conta da linha Problemas da Grade: atrasadas e críticas por frente.
      </p>
    </section>
  )
}
