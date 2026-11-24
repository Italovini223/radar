"use client"

import { useRef, useState } from "react"
import { isValid, parseISO } from "date-fns"
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
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { rotuloDataReferencia } from "@/lib/domain/rotulos"
import type { Frente } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useRadarStore } from "@/lib/store"
import { nomeCurtoFrente } from "@/lib/domain/frentes"

const MIN = 1
const MAX = 730

function inteiroValido(texto: string, min: number, max: number): number | null {
  if (texto.trim() === "") return null
  const v = Number(texto)
  return Number.isInteger(v) && v >= min && v <= max ? v : null
}

function LinhaPrazo({ frente }: { frente: Frente }) {
  const setPrazo = useRadarStore((s) => s.setPrazo)
  const [prazo, setPrazoTexto] = useState(String(frente.prazoDias))
  const [critico, setCriticoTexto] = useState(String(frente.criticoAposDias))
  const prazoNum = inteiroValido(prazo, MIN, MAX)
  const criticoNum = inteiroValido(critico, MIN, MAX * 2)
  const prazoInvalido = prazoNum === null
  const criticoInvalido =
    criticoNum === null || (prazoNum !== null && criticoNum <= prazoNum)
  const erroId = `prazo-erro-${frente.id}`

  function confirmar() {
    if (prazoInvalido || criticoInvalido) {
      // Valores inválidos voltam para o que está salvo.
      if (prazoInvalido) setPrazoTexto(String(frente.prazoDias))
      if (criticoInvalido) setCriticoTexto(String(frente.criticoAposDias))
      return
    }
    if (prazoNum !== frente.prazoDias || criticoNum !== frente.criticoAposDias) {
      void setPrazo(frente.id, prazoNum, criticoNum).then((ok) => {
        if (ok) {
          toast.success(
            `${nomeCurtoFrente(frente)}: prazo ${prazoNum} dias, crítica a partir de ${criticoNum}.`,
            { description: "Grade e Radar foram reclassificados." }
          )
        }
      })
    }
  }

  const campo = (
    id: string,
    valor: string,
    onChange: (v: string) => void,
    invalido: boolean,
    max: number,
    rotulo: string
  ) => (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        name={id}
        autoComplete="off"
        type="number"
        inputMode="numeric"
        min={MIN}
        max={max}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            confirmar()
          }
        }}
        aria-label={rotulo}
        aria-invalid={invalido || undefined}
        aria-describedby={invalido ? erroId : undefined}
        className="tnum w-24"
      />
      <span className="text-xs text-muted-foreground">dias</span>
    </div>
  )

  const p = frente.prazoDias
  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <label htmlFor={`prazo-${frente.id}`} className="font-medium">
          {nomeCurtoFrente(frente)}
        </label>
        <span className="block text-xs text-muted-foreground">{frente.setor}</span>
      </TableCell>
      <TableCell>
        {campo(`prazo-${frente.id}`, prazo, setPrazoTexto, prazoInvalido, MAX, `Prazo de ${nomeCurtoFrente(frente)}`)}
        {prazoInvalido || criticoInvalido ? (
          <span id={erroId} className="mt-1 block text-xs font-medium text-destructive">
            {prazoInvalido
              ? `Prazo: número inteiro entre ${MIN} e ${MAX}.`
              : "O limite crítico deve ser maior que o prazo."}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        {campo(`critico-${frente.id}`, critico, setCriticoTexto, criticoInvalido, MAX * 2, `Vira crítico após, ${nomeCurtoFrente(frente)}`)}
      </TableCell>
      <TableCell className="tnum text-muted-foreground">
        {Math.ceil(p * 0.75)} a {p} dias (só aviso)
      </TableCell>
      <TableCell className="tnum text-muted-foreground">
        de {p + 1} a {frente.criticoAposDias - 1} dias
      </TableCell>
      <TableCell className="tnum pr-4 text-muted-foreground">
        {frente.criticoAposDias} dias ou mais
      </TableCell>
    </TableRow>
  )
}

/** Campo numérico da configuração: grava ao sair do campo ou com Enter. */
function CampoConfig({
  id,
  rotulo,
  descricao,
  valor,
  min,
  max,
  onSalvar,
}: {
  id: string
  rotulo: string
  descricao: string
  valor: number
  min: number
  max: number
  onSalvar: (v: number) => void
}) {
  const [texto, setTexto] = useState(String(valor))
  const v = inteiroValido(texto, min, max)
  function confirmar() {
    if (v === null) {
      setTexto(String(valor))
      return
    }
    if (v !== valor) onSalvar(v)
  }
  return (
    <Field data-invalid={v === null || undefined}>
      <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
      <Input
        id={id}
        name={id}
        type="number"
        inputMode="numeric"
        autoComplete="off"
        min={min}
        max={max}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            confirmar()
          }
        }}
        aria-invalid={v === null || undefined}
        className="tnum w-28"
      />
      <FieldDescription>
        {v === null ? `Use um número inteiro entre ${min} e ${max}. ` : ""}
        {descricao}
      </FieldDescription>
    </Field>
  )
}

function SecaoData() {
  const { configuracao, hoje } = useRadar()
  const atualizar = useRadarStore((s) => s.atualizarConfiguracao)
  const [dataRef, setDataRef] = useState(configuracao.dataReferencia)
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataRef) && isValid(parseISO(dataRef))

  function salvar(parcial: Partial<typeof configuracao>, msg: string) {
    void atualizar(parcial).then((ok) => {
      if (ok) toast.success(msg, { description: "Radar e Grade foram recalculados." })
    })
  }

  return (
    <section data-entra aria-labelledby="titulo-data" className="mb-10">
      <h2 id="titulo-data" className="mb-2 text-xl font-medium">
        Data de referência e limites
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        {rotuloDataReferencia(configuracao, hoje)}. O gabarito de teste da
        demonstração só vale em 13/11/2026: com outra data, os dias parados e
        os alertas mudam. Use &ldquo;Hoje real&rdquo; para ver o Radar com a
        data de hoje.
      </p>
      <div className="grid max-w-3xl gap-6 rounded-lg bg-card p-5 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel id="rotulo-modo-data">Data usada pelo Radar</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={configuracao.usarHojeReal ? "real" : "referencia"}
            onValueChange={(v) => {
              if (!v) return
              const real = v === "real"
              if (real !== configuracao.usarHojeReal) {
                salvar(
                  { usarHojeReal: real },
                  real ? "Usando a data de hoje." : "Usando a data de referência."
                )
              }
            }}
            aria-labelledby="rotulo-modo-data"
          >
            <ToggleGroupItem value="referencia">Data de referência</ToggleGroupItem>
            <ToggleGroupItem value="real">Hoje real</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field data-invalid={!dataValida || undefined}>
          <FieldLabel htmlFor="config-data-ref">Data de referência</FieldLabel>
          <Input
            id="config-data-ref"
            name="data-referencia"
            type="date"
            autoComplete="off"
            value={dataRef}
            disabled={configuracao.usarHojeReal}
            onChange={(e) => setDataRef(e.target.value)}
            onBlur={() => {
              if (!dataValida) {
                setDataRef(configuracao.dataReferencia)
              } else if (dataRef !== configuracao.dataReferencia) {
                salvar({ dataReferencia: dataRef }, "Data de referência atualizada.")
              }
            }}
            aria-invalid={!dataValida || undefined}
            className="tnum w-44"
          />
          <FieldDescription>
            {configuracao.usarHojeReal
              ? "Desligada enquanto \"Hoje real\" está ativo."
              : "O \"hoje\" da demonstração (padrão: 13/11/2026)."}
          </FieldDescription>
        </Field>
        <CampoConfig
          key={`lim-${configuracao.limiteAprovacaoDias}`}
          id="config-limite-aprovacao"
          rotulo="Limite de aprovação (dias)"
          descricao="Entrega aguardando aprovação há MAIS dias que isso vira alerta."
          valor={configuracao.limiteAprovacaoDias}
          min={1}
          max={365}
          onSalvar={(v) =>
            salvar({ limiteAprovacaoDias: v }, `Limite de aprovação: ${v} dias.`)
          }
        />
        <CampoConfig
          key={`blq-${configuracao.bloqueioContratualDias}`}
          id="config-bloqueio"
          rotulo="Bloqueio contratual (dias)"
          descricao="Loja em criação: dias sem retorno do cliente até o bloqueio."
          valor={configuracao.bloqueioContratualDias}
          min={1}
          max={3650}
          onSalvar={(v) =>
            salvar({ bloqueioContratualDias: v }, `Bloqueio contratual: ${v} dias.`)
          }
        />
      </div>
    </section>
  )
}

function Conteudo() {
  const { frentes, configuracao } = useRadar()
  const resetarDemo = useRadarStore((s) => s.resetarDemo)
  const [confirma, setConfirma] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  useEntrada(raiz)

  return (
    <div ref={raiz}>
      <PageHeading title="Configurações" />

      <SecaoData />

      <section data-entra aria-labelledby="titulo-prazos" className="mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="titulo-prazos" className="text-xl font-medium">
            Prazos por frente
          </h2>
          <span className="text-sm text-muted-foreground">
            (a validar com os setores)
          </span>
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Prazo é o tempo máximo desejado entre duas ações concluídas na mesma
          frente; &ldquo;vira crítico após&rdquo; é o limite da faixa crítica.
          As faixas ao lado mostram quando cada estado começa. Ao mudar um
          valor, a Grade e o Radar recalculam na hora.
        </p>
        <div className="overflow-hidden rounded-lg bg-card">
          <Table className="min-w-[56rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="h-11 px-4 text-xs font-medium text-foreground">
                  Frente
                </TableHead>
                <TableHead scope="col" className="text-xs font-medium text-foreground">
                  Prazo
                </TableHead>
                <TableHead scope="col" className="text-xs font-medium text-foreground">
                  Vira crítico após
                </TableHead>
                <TableHead scope="col" className="text-xs font-medium text-foreground">
                  Atenção
                </TableHead>
                <TableHead scope="col" className="text-xs font-medium text-foreground">
                  Atrasada
                </TableHead>
                <TableHead scope="col" className="pr-4 text-xs font-medium text-foreground">
                  Crítica
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frentes.map((f) => (
                <LinhaPrazo key={`${f.id}-${f.prazoDias}-${f.criticoAposDias}`} frente={f} />
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Atenção (perto do prazo) é só aviso e não gera alerta. Crítica também
          vale para frente que nunca teve ação. Entrega aguardando aprovação há
          mais de {configuracao.limiteAprovacaoDias} dias gera um alerta próprio.
        </p>
      </section>

      <section data-entra aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className="mb-2 text-xl font-medium">
          Dados de demonstração
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Todos os clientes e ações deste protótipo são fictícios e ficam salvos
          no banco do Radar (não só neste navegador). Resetar apaga o que foi
          registrado e recarrega os dez clientes do gabarito, com data de
          referência 13/11/2026.
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
              Ações, check-ups, atribuições, prazos e a configuração voltam ao
              estado inicial para todas as pessoas que usam o Radar. Isso não
              pode ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirma(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirma(false)
                void resetarDemo().then((ok) => {
                  if (ok) toast.success("Dados de demonstração restaurados.")
                })
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
