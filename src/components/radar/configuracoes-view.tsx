"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import {
  ComDados,
  PageHeading,
} from "@/components/radar/page-states"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Frente } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useRadarStore } from "@/lib/store"

const MIN = 1
const MAX = 730

function LinhaPrazo({ frente }: { frente: Frente }) {
  const setPrazo = useRadarStore((s) => s.setPrazo)
  const [texto, setTexto] = useState(String(frente.prazoDias))
  const valor = Number(texto)
  const invalido =
    texto.trim() === "" || !Number.isInteger(valor) || valor < MIN || valor > MAX
  const erroId = `prazo-erro-${frente.id}`

  function confirmar() {
    if (invalido) {
      setTexto(String(frente.prazoDias))
      return
    }
    if (valor !== frente.prazoDias) {
      setPrazo(frente.id, valor)
      toast.success(`Prazo de ${frente.nome}: ${valor} dias.`, {
        description: "Grade e Radar foram reclassificados.",
      })
    }
  }

  const p = frente.prazoDias
  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <label htmlFor={`prazo-${frente.id}`} className="font-semibold">
          {frente.nome}
        </label>
        <span className="block text-xs text-muted-foreground">{frente.setor}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            id={`prazo-${frente.id}`}
            name={`prazo-${frente.id}`}
            autoComplete="off"
            type="number"
            inputMode="numeric"
            min={MIN}
            max={MAX}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                confirmar()
              }
            }}
            aria-invalid={invalido || undefined}
            aria-describedby={invalido ? erroId : undefined}
            className="tnum w-24"
          />
          <span className="text-xs text-muted-foreground">dias</span>
        </div>
        {invalido ? (
          <span id={erroId} className="mt-1 block text-xs font-medium text-destructive">
            Use um número inteiro entre {MIN} e {MAX}.
          </span>
        ) : null}
      </TableCell>
      <TableCell className="tnum text-muted-foreground">
        a partir de {Math.ceil(p * 0.75)} dias
      </TableCell>
      <TableCell className="tnum text-muted-foreground">
        acima de {p} dias
      </TableCell>
      <TableCell className="tnum pr-4 text-muted-foreground">
        acima de {Math.floor(p * 1.5)} dias
      </TableCell>
    </TableRow>
  )
}

function Conteudo() {
  const { frentes } = useRadar()
  const resetarDemo = useRadarStore((s) => s.resetarDemo)
  const [confirma, setConfirma] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  useEntrada(raiz)

  return (
    <div ref={raiz}>
      <PageHeading title="Configurações" />

      <section data-entra aria-labelledby="titulo-prazos" className="mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="titulo-prazos" className="text-xl font-bold">
            Prazos por frente
          </h2>
          <span className="text-sm text-muted-foreground">
            (a validar com os setores)
          </span>
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Prazo é o tempo máximo desejado entre duas ações concluídas na mesma
          frente. As faixas ao lado mostram quando cada estado começa. Ao
          mudar um prazo, a Grade e o Radar recalculam na hora.
        </p>
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="h-11 px-4 text-xs font-bold text-foreground">
                  Frente
                </TableHead>
                <TableHead scope="col" className="text-xs font-bold text-foreground">
                  Prazo
                </TableHead>
                <TableHead scope="col" className="text-xs font-bold text-foreground">
                  Atenção
                </TableHead>
                <TableHead scope="col" className="text-xs font-bold text-foreground">
                  Atrasada
                </TableHead>
                <TableHead scope="col" className="pr-4 text-xs font-bold text-foreground">
                  Crítica
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frentes.map((f) => (
                <LinhaPrazo key={`${f.id}-${f.prazoDias}`} frente={f} />
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Crítica também vale para frente que nunca teve ação. Entrega
          aguardando aprovação há mais de 7 dias gera um alerta próprio.
        </p>
      </section>

      <section data-entra aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className="mb-2 text-xl font-bold">
          Dados de demonstração
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Todos os clientes e ações deste protótipo são fictícios e ficam salvos
          só neste navegador. Resetar apaga o que você registrou e restaura os
          cinco clientes com os gargalos de exemplo, datados a partir de hoje.
        </p>
        <Button variant="outline" onClick={() => setConfirma(true)}>
          Resetar dados de demonstração
        </Button>
      </section>

      <Dialog open={confirma} onOpenChange={setConfirma}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Resetar dados de demonstração?
            </DialogTitle>
            <DialogDescription>
              Ações, check-ups, atribuições e prazos alterados voltam ao estado
              inicial. Isso não pode ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirma(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetarDemo()
                setConfirma(false)
                toast.success("Dados de demonstração restaurados.")
              }}
            >
              Resetar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ConfiguracoesView() {
  return (
    <ComDados rows={4}>
      <Conteudo />
    </ComDados>
  )
}
