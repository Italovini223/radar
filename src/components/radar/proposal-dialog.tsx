"use client"

import { useEffect, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  AVISO_RASCUNHO,
  proposalGenerator,
  type Proposal,
} from "@/lib/ai/proposal"
import { aoAparecer } from "@/lib/motion/aparece"
import { formatarDias } from "@/lib/domain/opportunities"
import {
  SETORES,
  type Client,
  type Frente,
  type Opportunity,
  type Setor,
} from "@/lib/domain/types"
import { useRadarStore } from "@/lib/store"
import { nomeCurtoFrente } from "@/lib/domain/frentes"

export function ProposalDialog({
  aberto,
  oportunidade,
  cliente,
  frente,
  tituloAcao,
  onClose,
  devolverFoco,
}: {
  aberto: boolean
  oportunidade: Opportunity | null
  cliente: Client | undefined
  frente: Frente | undefined
  tituloAcao?: string
  onClose: () => void
  /** Elemento que abriu o diálogo; recebe o foco ao fechar. */
  devolverFoco?: () => HTMLElement | null
}) {
  return (
    <Dialog
      open={aberto && !!oportunidade && !!cliente && !!frente}
      onOpenChange={(v) => (v ? undefined : onClose())}
    >
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl"
        onCloseAutoFocus={(e) => {
          const alvo = devolverFoco?.()
          if (alvo) {
            e.preventDefault()
            alvo.focus()
          }
        }}
      >
        {oportunidade && cliente && frente ? (
          <ProposalBody
            key={oportunidade.id}
            oportunidade={oportunidade}
            cliente={cliente}
            frente={frente}
            tituloAcao={tituloAcao}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Plano B para navegadores sem Clipboard API: seleciona e copia. */
function copiarPorSelecao(texto: string): boolean {
  const campo = document.createElement("textarea")
  campo.value = texto
  campo.setAttribute("readonly", "")
  campo.style.cssText = "position:fixed;top:0;left:0;opacity:0"
  document.body.appendChild(campo)
  campo.select()
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  campo.remove()
  return ok
}

/** Monta só com o diálogo aberto (e por oportunidade): gera o rascunho ao montar. */
function ProposalBody({
  oportunidade,
  cliente,
  frente,
  tituloAcao,
}: {
  oportunidade: Opportunity
  cliente: Client
  frente: Frente
  tituloAcao?: string
}) {
  const atribuir = useRadarStore((s) => s.atribuir)
  const [proposta, setProposta] = useState<Proposal | null>(null)
  const [texto, setTexto] = useState("")
  const [setor, setSetor] = useState<Setor | "">("")
  const [erro, setErro] = useState<string | null>(null)
  const [copia, setCopia] = useState<"nenhum" | "copiado" | "erro">("nenhum")
  const [atribuidaA, setAtribuidaA] = useState<Setor | null>(null)
  const textoId = useId()

  useEffect(() => {
    let cancelado = false
    proposalGenerator
      .gerar({
        oportunidade,
        clienteNome: cliente.nome,
        frenteNome: nomeCurtoFrente(frente),
        setor: frente.setor,
        tituloAcao,
      })
      .then((p) => {
        if (cancelado) return
        setProposta(p)
        setTexto(p.texto)
        setSetor(p.setorSugerido)
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível gerar o rascunho agora.")
      })
    return () => {
      cancelado = true
    }
  }, [oportunidade, cliente, frente, tituloAcao])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopia("copiado")
    } catch {
      // Fora de contexto seguro (http na rede local) a Clipboard API não existe.
      setCopia(copiarPorSelecao(texto) ? "copiado" : "erro")
    }
  }

  function atribuirAoSetor() {
    if (!setor) return
    atribuir(oportunidade, setor, texto)
    setAtribuidaA(setor)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {oportunidade.tipo === "aprovacao"
            ? `Lembrete para ${cliente.nome}`
            : `Proposta para ${cliente.nome}`}
        </DialogTitle>
        <DialogDescription>
          {frente.setor} · {nomeCurtoFrente(frente)}
          {oportunidade.diasParado !== null
            ? ` · ${oportunidade.tipo === "aprovacao" ? "aguardando" : "parado"} há ${formatarDias(oportunidade.diasParado)}`
            : " · sem nenhuma ação registrada"}
        </DialogDescription>
      </DialogHeader>

      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : !proposta ? (
        <div
          role="status"
          aria-label="Gerando rascunho…"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <>
          <section aria-labelledby={`${textoId}-titulo`} className="grid gap-2">
            <h3 id={`${textoId}-titulo`} className="text-base font-medium">
              Texto para o cliente
            </h3>
            <p className="text-sm font-medium text-state-warn">
              {AVISO_RASCUNHO}. Edite à vontade.
            </p>
            <Textarea
              id={textoId}
              aria-labelledby={`${textoId}-titulo`}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setCopia("nenhum")
              }}
              rows={8}
              className="max-h-56 leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={copiar}>
                Copiar texto
              </Button>
              <span aria-live="polite" data-confirmacao="copiado">
                {copia === "nenhum" ? null : (
                  <span
                    key={copia}
                    ref={aoAparecer}
                    className={
                      copia === "erro"
                        ? "inline-block text-sm font-medium text-destructive"
                        : "inline-block text-sm font-medium text-state-ok"
                    }
                  >
                    {copia === "copiado"
                      ? "Copiado"
                      : "Não foi possível copiar. Selecione o texto e copie à mão."}
                  </span>
                )}
              </span>
            </div>
          </section>

          <section
            aria-labelledby={`${textoId}-interno`}
            className="grid gap-2 border-t pt-4"
          >
            <h3 id={`${textoId}-interno`} className="text-base font-medium">
              Interno
            </h3>
            <p className="text-sm text-muted-foreground">
              Fica só no Radar. O cliente não vê.
            </p>
            {atribuidaA ? (
              <div
                ref={aoAparecer}
                role="status"
                data-confirmacao="atribuida"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-state-ok-line bg-state-ok-soft px-4 py-3 text-sm text-state-ok"
              >
                <span className="font-medium">
                  Atribuída ao setor {atribuidaA}. Segue no Radar com a marca de
                  atribuída.
                </span>
                <DialogClose asChild>
                  <Button size="sm">Fechar</Button>
                </DialogClose>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <Field className="w-full sm:w-64">
                  <FieldLabel id={`${textoId}-setor`}>Responsável</FieldLabel>
                  <Select
                    value={setor}
                    onValueChange={(v) => setSetor(v as Setor)}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-labelledby={`${textoId}-setor`}
                    >
                      <SelectValue placeholder="Escolha um setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SETORES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Button onClick={atribuirAoSetor} disabled={!setor}>
                  Atribuir ao setor
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
