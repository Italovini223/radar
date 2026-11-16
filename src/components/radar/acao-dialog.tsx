"use client"

import { useId, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toISODate } from "@/lib/domain/rules"
import type { Client, Frente, StatusAcao } from "@/lib/domain/types"
import { useRadarStore } from "@/lib/store"

export const ROTULO_STATUS: Record<StatusAcao, string> = {
  concluida: "Concluída",
  em_andamento: "Em andamento",
  aguardando_aprovacao: "Aguardando aprovação",
}

export function AcaoDialog({
  aberto,
  onOpenChange,
  cliente,
  frentes,
  frenteInicial,
  hoje,
}: {
  aberto: boolean
  onOpenChange: (v: boolean) => void
  cliente: Client
  frentes: Frente[]
  frenteInicial?: string
  hoje: Date
}) {
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* O conteúdo só monta com o diálogo aberto: estado novo a cada abertura. */}
        <AcaoForm
          onOpenChange={onOpenChange}
          cliente={cliente}
          frentes={frentes}
          frenteInicial={frenteInicial}
          hoje={hoje}
        />
      </DialogContent>
    </Dialog>
  )
}

function AcaoForm({
  onOpenChange,
  cliente,
  frentes,
  frenteInicial,
  hoje,
}: {
  onOpenChange: (v: boolean) => void
  cliente: Client
  frentes: Frente[]
  frenteInicial?: string
  hoje: Date
}) {
  const registrarAcao = useRadarStore((s) => s.registrarAcao)
  const id = useId()
  const hojeISO = toISODate(hoje)
  const [frenteId, setFrenteId] = useState(frenteInicial ?? frentes[0]?.id ?? "")
  const [titulo, setTitulo] = useState("")
  const [data, setData] = useState(hojeISO)
  const [status, setStatus] = useState<StatusAcao>("concluida")
  const [tentou, setTentou] = useState(false)

  const tituloInvalido = tentou && titulo.trim() === ""
  const dataInvalida = data === "" || data > hojeISO

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (titulo.trim() === "") {
      document.getElementById(`${id}-titulo`)?.focus()
      return
    }
    if (dataInvalida) {
      document.getElementById(`${id}-data`)?.focus()
      return
    }
    if (!frenteId) return
    registrarAcao({
      clientId: cliente.id,
      frenteId,
      titulo: titulo.trim(),
      data,
      status,
    })
    toast.success("Ação registrada.", {
      description: "As regras já recalcularam a grade e o Radar.",
    })
    onOpenChange(false)
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Registrar ação</DialogTitle>
            <DialogDescription>
              {cliente.nome}. Só ações concluídas zeram o contador da frente.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-frente`}>Frente</FieldLabel>
              <Select value={frenteId} onValueChange={setFrenteId}>
                <SelectTrigger id={`${id}-frente`} className="w-full">
                  <SelectValue placeholder="Escolha a frente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {frentes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={tituloInvalido || undefined}>
              <FieldLabel htmlFor={`${id}-titulo`}>O que foi feito</FieldLabel>
              <Input
                id={`${id}-titulo`}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                name="titulo"
                placeholder="Ex.: Revisão das campanhas de busca…"
                aria-invalid={tituloInvalido || undefined}
                autoComplete="off"
              />
              {tituloInvalido ? (
                <FieldError>Descreva a ação em poucas palavras.</FieldError>
              ) : null}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={dataInvalida || undefined}>
                <FieldLabel htmlFor={`${id}-data`}>Data</FieldLabel>
                <Input
                  id={`${id}-data`}
                  type="date"
                  value={data}
                  max={hojeISO}
                  onChange={(e) => setData(e.target.value)}
                  aria-invalid={dataInvalida || undefined}
                  name="data"
                  autoComplete="off"
                  className="tnum"
                />
                {dataInvalida ? (
                  <FieldError>Use uma data até hoje.</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusAcao)}
                >
                  <SelectTrigger id={`${id}-status`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.keys(ROTULO_STATUS) as StatusAcao[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ROTULO_STATUS[s]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {status === "aguardando_aprovacao" ? (
                  <FieldDescription>
                    Acima de 7 dias vira alerta no Radar.
                  </FieldDescription>
                ) : null}
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar ação</Button>
          </DialogFooter>
        </form>
  )
}
