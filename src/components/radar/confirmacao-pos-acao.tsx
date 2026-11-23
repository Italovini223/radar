"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

import { ProposalDialog } from "@/components/radar/proposal-dialog"
import { Button } from "@/components/ui/button"
import { useConfirmacaoStore } from "@/lib/confirmacao"
import { textosPosAcao } from "@/lib/domain/pos-acao"
import { useRadar } from "@/lib/hooks"
import { aoAparecer } from "@/lib/motion/aparece"
import { reduzMovimento } from "@/lib/motion/movimento"
import { cn } from "@/lib/utils"

/**
 * Confirmação inline persistente da tarefa principal: o que mudou depois de
 * registrar uma ação (alerta resolvido ou não) e a próxima oportunidade
 * sugerida do cliente. Só aparece se `clienteId` for omitido ou coincidir.
 */
export function ConfirmacaoPosAcao({
  clienteId,
  className,
}: {
  /** Mostra só se a confirmação for deste cliente (ficha e check-up). */
  clienteId?: string
  className?: string
}) {
  const resumo = useConfirmacaoStore((s) => s.resumo)
  const numero = useConfirmacaoStore((s) => s.numero)
  const fechar = useConfirmacaoStore((s) => s.fechar)
  const { clients, frentes, acoes } = useRadar()
  const [propostaAberta, setPropostaAberta] = useState(false)
  const gatilho = useRef<HTMLElement | null>(null)
  const raiz = useRef<HTMLDivElement | null>(null)
  // Ref estável: a entrada anima uma vez por confirmação, não a cada render.
  const refRaiz = useCallback((el: HTMLDivElement | null) => {
    raiz.current = el
    aoAparecer(el)
  }, [])

  const frentePorId = useMemo(() => new Map(frentes.map((f) => [f.id, f])), [frentes])
  const visivel = !!resumo && (!clienteId || resumo.clientId === clienteId)

  // Traz a confirmação para a tela (o cartão clicado pode estar bem abaixo).
  useEffect(() => {
    if (!visivel) return
    raiz.current?.scrollIntoView({
      block: "nearest",
      behavior: reduzMovimento() ? "auto" : "smooth",
    })
  }, [visivel, numero])

  if (!resumo || !visivel) return null
  const cliente = clients.find((c) => c.id === resumo.clientId)
  if (!cliente) return null

  const textos = textosPosAcao(resumo, {
    cliente: cliente.nome,
    frente: (id) => frentePorId.get(id)?.nome ?? id,
  })
  const proxima = resumo.proxima
  const frenteProxima = proxima ? frentePorId.get(proxima.frenteId) : undefined
  const tituloAcao =
    proxima?.tipo === "aprovacao"
      ? acoes.find(
          (a) =>
            a.clientId === proxima.clientId &&
            a.frenteId === proxima.frenteId &&
            a.status === "aguardando_aprovacao"
        )?.titulo
      : undefined

  const tom =
    textos.tom === "resolvido"
      ? "border-state-ok-line bg-state-ok-soft"
      : textos.tom === "sem_efeito"
        ? "border-state-warn-line bg-state-warn-soft"
        : "bg-card"

  return (
    <div
      key={numero}
      ref={refRaiz}
      role="status"
      aria-live="polite"
      data-testid="confirmacao-pos-acao"
      className={cn("rounded-lg border p-4 shadow-card sm:p-5", tom, className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-base font-bold",
              textos.tom === "resolvido" && "text-state-ok",
              textos.tom === "sem_efeito" && "text-state-warn"
            )}
          >
            {textos.titulo}
          </p>
          {textos.detalhe ? (
            <p className="mt-1 text-sm text-muted-foreground">{textos.detalhe}</p>
          ) : null}
        </div>
        <Button size="sm" variant="ghost" onClick={() => fechar()}>
          Fechar
        </Button>
      </div>

      <div className="mt-3 border-t border-current/10 pt-3">
        {proxima && textos.proxima ? (
          <>
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {textos.proxima.titulo}
            </p>
            <p className="mt-1 text-base font-semibold">{textos.proxima.frente}</p>
            <p className="text-sm text-foreground">{textos.proxima.motivo}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {frenteProxima ? (
                <Button
                  size="sm"
                  onClick={() => {
                    gatilho.current = document.activeElement as HTMLElement | null
                    setPropostaAberta(true)
                  }}
                  aria-label={`Ver proposta para ${cliente.nome}, ${frenteProxima.nome}`}
                >
                  Ver proposta
                </Button>
              ) : null}
              {!clienteId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/clientes/${cliente.id}?frente=${proxima.frenteId}`}>
                    Abrir ficha
                  </Link>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="text-base font-semibold">{textos.vazio}</p>
            {!clienteId ? (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={`/clientes/${cliente.id}`}>Abrir ficha</Link>
              </Button>
            ) : null}
          </>
        )}
      </div>

      {proxima && frenteProxima ? (
        <ProposalDialog
          aberto={propostaAberta}
          oportunidade={proxima}
          cliente={cliente}
          frente={frenteProxima}
          tituloAcao={tituloAcao}
          onClose={() => setPropostaAberta(false)}
          devolverFoco={() => gatilho.current}
        />
      ) : null}
    </div>
  )
}
