"use client"

import { Suspense, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { EstadoBadge } from "@/components/radar/estado"
import {
  ComDados,
  PageHeading,
  PageSkeleton,
} from "@/components/radar/page-states"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { classificarDias, diasDesde, toISODate } from "@/lib/domain/rules"
import type {
  Client,
  Frente,
  ResultadoAds,
  StatusFrente,
} from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { gsap, useGSAP } from "@/lib/motion/gsap"
import { movimento } from "@/lib/motion/movimento"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useRadarStore } from "@/lib/store"

function Formulario({
  cliente,
  frentes,
  grade,
  hoje,
}: {
  cliente: Client
  frentes: Frente[]
  grade: StatusFrente[]
  hoje: Date
}) {
  const salvar = useRadarStore((s) => s.salvarCheckup)
  const id = useId()
  const hojeISO = toISODate(hoje)
  const atuais = useMemo(
    () =>
      Object.fromEntries(
        frentes.map((f) => [
          f.id,
          grade.find((g) => g.clientId === cliente.id && g.frenteId === f.id)
            ?.ultimaAcao ?? "",
        ])
      ),
    [frentes, grade, cliente.id]
  )
  const [datas, setDatas] = useState<Record<string, string>>(atuais)
  const [ads, setAds] = useState<ResultadoAds | "">("")
  const [salvo, setSalvo] = useState<number | null>(null)
  const resumo = useRef<HTMLDivElement>(null)

  // Resumo do que mudou: entra em sequência depois de salvar.
  useGSAP(
    () => {
      if (salvo === null) return
      return movimento(() => {
        gsap.from(resumo.current?.children ?? [], {
          autoAlpha: 0,
          y: 6,
          duration: 0.3,
          stagger: 0.06,
          clearProps: "opacity,visibility,transform",
        })
      })
    },
    { dependencies: [salvo], scope: resumo }
  )

  const alteradas = frentes.filter(
    (f) => datas[f.id] && datas[f.id] !== atuais[f.id]
  )
  const futura = frentes.some((f) => (datas[f.id] ?? "") > hojeISO)

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (futura) {
      const primeira = frentes.find((f) => (datas[f.id] ?? "") > hojeISO)
      if (primeira) document.getElementById(`${id}-${primeira.id}`)?.focus()
      return
    }
    const mudou = salvar({
      clientId: cliente.id,
      entradas: frentes.map((f) => ({ frenteId: f.id, data: datas[f.id] ?? "" })),
      resultadoAds: ads || undefined,
    })
    setSalvo(mudou.length)
    toast.success(`Check-up de ${cliente.nome} salvo.`, {
      description:
        mudou.length === 0
          ? "Nenhuma data mudou."
          : `${mudou.length} ${mudou.length === 1 ? "frente atualizada" : "frentes atualizadas"}. Radar e Grade já recalcularam.`,
    })
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend>Data aproximada da última ação em cada frente</FieldLegend>
        <FieldDescription>
          Já vem preenchido com o que está registrado. Altere só o que estiver
          diferente; campo vazio não muda nada.
        </FieldDescription>
        <div className="overflow-hidden rounded-md border bg-card">
          <ul>
            {frentes.map((f) => {
              const valor = datas[f.id] ?? ""
              const invalida = valor > hojeISO
              const preview = valor
                ? classificarDias(diasDesde(valor, hoje), f.prazoDias)
                : null
              return (
                <li
                  key={f.id}
                  className="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_11rem_10rem]"
                >
                  <div>
                    <label htmlFor={`${id}-${f.id}`} className="font-semibold">
                      {f.nome}
                    </label>
                    <p className="tnum text-xs text-muted-foreground">
                      {f.setor} · prazo {f.prazoDias} dias
                      {atuais[f.id] ? "" : " · nenhuma ação registrada"}
                    </p>
                  </div>
                  <Input
                    id={`${id}-${f.id}`}
                    type="date"
                    value={valor}
                    max={hojeISO}
                    onChange={(e) =>
                      setDatas((d) => ({ ...d, [f.id]: e.target.value }))
                    }
                    aria-invalid={invalida || undefined}
                    aria-describedby={invalida ? `${id}-${f.id}-erro` : undefined}
                    name={`data-${f.id}`}
                    autoComplete="off"
                    className="tnum"
                  />
                  <div className="min-h-5" aria-live="polite">
                    {invalida ? (
                      <span
                        id={`${id}-${f.id}-erro`}
                        className="text-xs font-medium text-destructive"
                      >
                        Use uma data até hoje.
                      </span>
                    ) : preview ? (
                      <EstadoBadge estado={preview.estado} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sem data
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </FieldSet>

      <FieldGroup>
        <Field>
          <FieldLabel id={`${id}-ads`}>Resultado de Ads (anotação manual)</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={ads}
            onValueChange={(v) => setAds(v as ResultadoAds | "")}
            aria-labelledby={`${id}-ads`}
          >
            <ToggleGroupItem value="subindo">Subindo</ToggleGroupItem>
            <ToggleGroupItem value="estavel">Estável</ToggleGroupItem>
            <ToggleGroupItem value="caindo">Caindo</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            Fica na ficha do cliente. Não entra no cálculo dos alertas, que
            usam só prazo e data.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">
          Salvar check-up
        </Button>
        <span className="tnum text-sm text-muted-foreground" aria-live="polite">
          {alteradas.length === 0
            ? "Nenhuma data alterada ainda."
            : `${alteradas.length} ${alteradas.length === 1 ? "data alterada" : "datas alteradas"}.`}
        </span>
      </div>

      {salvo !== null ? (
        <div
          ref={resumo}
          role="status"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-state-ok-line bg-state-ok-soft px-4 py-3 text-sm text-state-ok"
        >
          <span className="font-bold">Check-up salvo.</span>
          <Link href="/radar" className="font-semibold underline">
            Ver no Radar
          </Link>
          <Link href="/grade" className="font-semibold underline">
            Ver na Grade
          </Link>
          <Link
            href={`/clientes/${cliente.id}`}
            className="font-semibold underline"
          >
            Abrir ficha
          </Link>
        </div>
      ) : null}
    </form>
  )
}

function Conteudo() {
  const { clients, frentes, grade, hoje } = useRadar()
  const params = useSearchParams()
  const ativos = clients.filter((c) => c.ativo)
  const [escolhido, setEscolhido] = useState<string | undefined>(
    params.get("cliente") ?? undefined
  )
  const cliente = ativos.find((c) => c.id === escolhido) ?? ativos[0]
  const raiz = useRef<HTMLDivElement>(null)
  useEntrada(raiz)

  if (!cliente) {
    return (
      <p className="text-sm text-muted-foreground">
        Não há clientes ativos. Restaure os dados de demonstração em
        Configurações.
      </p>
    )
  }

  return (
    <div ref={raiz}>
      <PageHeading title="Check-up" />
      <div data-entra className="mb-6 max-w-sm">
        <Field>
          <FieldLabel htmlFor="checkup-cliente">Cliente</FieldLabel>
          <Select value={cliente.id} onValueChange={setEscolhido}>
            <SelectTrigger id="checkup-cliente" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ativos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div data-entra className="max-w-4xl">
        <Formulario
          key={cliente.id}
          cliente={cliente}
          frentes={frentes}
          grade={grade}
          hoje={hoje}
        />
      </div>
    </div>
  )
}

export function CheckupView() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <ComDados rows={4}>
        <Conteudo />
      </ComDados>
    </Suspense>
  )
}
