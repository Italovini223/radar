"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

import {
  OportunidadeCheia,
  OportunidadeLinha,
} from "@/components/radar/opportunity-card"
import {
  ComDados,
  PageHeading,
  PageSkeleton,
  SemResultados,
} from "@/components/radar/page-states"
import { AcaoDialog } from "@/components/radar/acao-dialog"
import { ConfirmacaoPosAcao } from "@/components/radar/confirmacao-pos-acao"
import { ProposalDialog } from "@/components/radar/proposal-dialog"
import { AlertasPorFrente } from "@/components/radar/alertas-por-frente"
import { GrupoDoCliente } from "@/components/radar/grupo-cliente"
import { PainelSaude, type AbaRadar } from "@/components/radar/painel-saude"
import { Button } from "@/components/ui/button"
import { Dica } from "@/components/ui/dica"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import { agruparPorCliente, alertasPorCliente } from "@/lib/domain/carteira"
import { setoresDasFrentes } from "@/lib/domain/frentes"
import { rotuloDataReferencia } from "@/lib/domain/rotulos"
import { SETORES, type Client, type Opportunity } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"
import { useFlipLista } from "@/lib/motion/use-flip-lista"
import { useRadarStore } from "@/lib/store"

type Aba = AbaRadar
type Ordem = "gravidade" | "cliente"

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

const ABAS: { valor: Aba; rotulo: string; dica: string }[] = [
  { valor: "todas", rotulo: "Todas", dica: "Mostrar todas as oportunidades" },
  { valor: "criticas", rotulo: "Críticas", dica: "Mostrar só as frentes críticas (passaram do limite ou nunca tiveram ação)" },
  { valor: "atrasadas", rotulo: "Atrasadas", dica: "Mostrar só as frentes que passaram do prazo, antes de virar críticas" },
  { valor: "aprovacao", rotulo: "Aguardando aprovação", dica: "Mostrar só as entregas travadas esperando o cliente aprovar" },
  { valor: "novas", rotulo: "Novas", dica: "Mostrar só os alertas novos (prazo vencido há até 14 dias)" },
]

const ATRASO_BUSCA_MS = 250

function daAba(o: Opportunity, aba: Aba): boolean {
  switch (aba) {
    case "criticas":
      return o.severidade === "alta"
    case "atrasadas":
      return o.tipo === "parada" && o.severidade !== "alta"
    case "aprovacao":
      return o.tipo === "aprovacao"
    case "novas":
      return o.nova
    default:
      return true
  }
}

function lerAba(v: string | null): Aba {
  if (v === "prioritarias") return "criticas" // link antigo
  return ABAS.some((a) => a.valor === v) ? (v as Aba) : "todas"
}

function Conteudo() {
  const {
    clients,
    frentes,
    acoes,
    atribuicoes,
    oportunidades,
    grade,
    situacoes,
    hoje,
    configuracao,
    contratos,
  } = useRadar()
  const recalcularAgora = useRadarStore((s) => s.recalcularAgora)

  // Filtros vivem na URL (compartilháveis e com voltar do navegador).
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const aba = lerAba(params.get("aba"))
  const buscaUrl = params.get("q") ?? ""
  const setorParam = params.get("setor") ?? "todos"
  const setor = (SETORES as readonly string[]).includes(setorParam)
    ? setorParam
    : "todos"
  const ordem: Ordem = params.get("ordem") === "cliente" ? "cliente" : "gravidade"
  // "Agrupar por cliente" e o foco em um cliente (vem do aviso "mais N alertas").
  const agrupado = params.get("agrupar") === "cliente"
  const clienteParam = params.get("cliente")

  // Lê a URL no momento da chamada: o envio da busca é atrasado e não pode
  // sobrescrever outro filtro alterado nesse intervalo.
  const atualizarUrl = useCallback(
    (mudancas: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search)
      for (const [k, v] of Object.entries(mudancas)) {
        if (v === null || v === "") next.delete(k)
        else next.set(k, v)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router]
  )
  const setAba = (v: Aba) => atualizarUrl({ aba: v === "todas" ? null : v })
  const setSetor = (v: string) => atualizarUrl({ setor: v === "todos" ? null : v })
  const setOrdem = (v: Ordem) =>
    atualizarUrl({ ordem: v === "gravidade" ? null : v })
  const setAgrupado = (v: boolean) => atualizarUrl({ agrupar: v ? "cliente" : null })

  // Busca: o campo é controlado por estado local (nenhuma tecla se perde) e a
  // URL é atualizada 250 ms depois da última tecla. Se a URL mudar por outro
  // motivo (voltar do navegador, "Limpar filtros"), o campo acompanha.
  const [busca, setBusca] = useState(buscaUrl)
  const enviados = useRef<string[]>([])
  const enviarBusca = useCallback(
    (valor: string) => {
      enviados.current.push(valor)
      atualizarUrl({ q: valor })
    },
    [atualizarUrl]
  )
  useEffect(() => {
    if (busca === buscaUrl) return
    const t = setTimeout(() => enviarBusca(busca), ATRASO_BUSCA_MS)
    return () => clearTimeout(t)
  }, [busca, buscaUrl, enviarBusca])
  useEffect(() => {
    const fila = enviados.current
    const i = fila.indexOf(buscaUrl)
    if (i >= 0) {
      // Eco de um envio nosso: descarta esse e os anteriores.
      enviados.current = fila.slice(i + 1)
      return
    }
    // Mudança externa: o campo passa a refletir a URL.
    setBusca(buscaUrl)
  }, [buscaUrl])

  const [aberta, setAberta] = useState<Opportunity | null>(null)
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const gatilho = useRef<HTMLElement | null>(null)
  // "Registrar ação" direto do cartão: cliente e frente já preenchidos.
  const [acaoAlvo, setAcaoAlvo] = useState<Opportunity | null>(null)

  const clientePorId = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  )
  const frentePorId = useMemo(
    () => new Map(frentes.map((f) => [f.id, f])),
    [frentes]
  )

  const clienteFoco =
    clienteParam && clientePorId.has(clienteParam) ? clienteParam : null
  const nomeFoco = clienteFoco ? clientePorId.get(clienteFoco)?.nome : undefined
  const alertasDoCliente = useMemo(
    () => alertasPorCliente(oportunidades),
    [oportunidades]
  )

  const baseFiltrada = useMemo(() => {
    const termo = normalizar(busca.trim())
    return oportunidades.filter((o) => {
      if (clienteFoco && o.clientId !== clienteFoco) return false
      if (setor !== "todos" && o.setorResponsavel !== setor) return false
      if (!termo) return true
      const c = clientePorId.get(o.clientId)
      const f = frentePorId.get(o.frenteId)
      return normalizar(
        `${c?.nome ?? ""} ${f?.nome ?? ""} ${o.motivo} ${o.setorResponsavel}`
      ).includes(termo)
    })
  }, [oportunidades, busca, setor, clienteFoco, clientePorId, frentePorId])

  const contagens = Object.fromEntries(
    ABAS.map((a) => [a.valor, baseFiltrada.filter((o) => daAba(o, a.valor)).length])
  ) as Record<Aba, number>

  const visiveis = useMemo(() => {
    const porAba = baseFiltrada.filter((o) => daAba(o, aba))
    if (ordem === "cliente") {
      return [...porAba].sort((a, b) =>
        (clientePorId.get(a.clientId)?.nome ?? "").localeCompare(
          clientePorId.get(b.clientId)?.nome ?? "",
          "pt-BR"
        )
      )
    }
    return porAba
  }, [baseFiltrada, aba, ordem, clientePorId])

  const criticas = visiveis.filter((o) => o.severidade === "alta")
  const demais = visiveis.filter((o) => o.severidade !== "alta")
  const grupos = useMemo(
    () =>
      agrupado ? agruparPorCliente(visiveis, clients, situacoes) : [],
    [agrupado, visiveis, clients, situacoes]
  )
  // Ordem em que os alertas aparecem na tela: o Flip compara por id, então a
  // mesma chave estável (id do alerta) vale nos dois modos.
  const chaveFlip = (agrupado
    ? grupos.flatMap((g) => g.alertas)
    : visiveis
  )
    .map((o) => o.id)
    .join("|")

  // Movimento: a lista desliza ao filtrar (Flip) e a tela entra em sequência.
  // O Flip vem antes da entrada para registrar as posições finais.
  const raiz = useRef<HTMLDivElement>(null)
  const lista = useRef<HTMLDivElement>(null)
  useFlipLista(lista, `${agrupado ? "g" : "l"}:${chaveFlip}`, { fantasmas: true })
  useEntrada(raiz)

  const filtrando =
    busca !== "" || setor !== "todos" || aba !== "todas" || clienteFoco !== null
  const limpar = () => {
    setBusca("")
    enviados.current = []
    atualizarUrl({ q: null, setor: null, aba: null, cliente: null })
  }
  // Aviso "mais N alertas": mostra todos os alertas daquele cliente, juntos.
  const verCliente = (c: Client) => {
    setBusca("")
    enviados.current = []
    atualizarUrl({
      agrupar: "cliente",
      cliente: c.id,
      q: null,
      setor: null,
      aba: null,
    })
  }

  const atribuicaoDe = (id: string) =>
    atribuicoes.find((a) => a.oportunidadeId === id)

  const tituloAcaoDe = (o: Opportunity) =>
    o.tipo === "aprovacao"
      ? acoes.find(
          (a) =>
            a.clientId === o.clientId &&
            a.frenteId === o.frenteId &&
            a.status === "aguardando_aprovacao"
        )?.titulo
      : undefined

  const abrirProposta = (o: Opportunity) => {
    gatilho.current = document.activeElement as HTMLElement | null
    setAberta(o)
    setDialogoAberto(true)
  }

  const n = oportunidades.length
  const rotuloData = rotuloDataReferencia(configuracao, hoje)
  const clienteDaAcao = acaoAlvo ? clientePorId.get(acaoAlvo.clientId) : undefined
  const frentesDaAcao = acaoAlvo
    ? frentes.filter((f) =>
        contratos.some(
          (c) => c.clientId === acaoAlvo.clientId && c.frenteId === f.id
        )
      )
    : []

  return (
    <div ref={raiz}>
      <PageHeading
        title="Radar de"
        italic="clientes"
        description={
          <span className="tnum">
            {rotuloData} · {n}{" "}
            {n === 1 ? "oportunidade" : "oportunidades"}
          </span>
        }
        actions={
          <Button
            dica="Recalcula alertas e prazos com os dados atuais"
            onClick={() => {
              recalcularAgora()
              toast.success(
                configuracao.usarHojeReal
                  ? "Alertas recalculados com a data de hoje."
                  : "Alertas recalculados na data de referência."
              )
            }}
          >
            Recalcular alertas
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PainelSaude
          grade={grade}
          oportunidades={oportunidades}
          situacoes={situacoes}
          ativa={aba}
          onFiltrar={setAba}
        />
        <AlertasPorFrente grade={grade} frentes={frentes} />
      </div>

      <ConfirmacaoPosAcao className="mt-6" />

      <section aria-label="Oportunidades" className="mt-8">
        <div
          data-entra
          className="mb-5 flex flex-col gap-4"
        >
          <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
            <TabsList
              variant="line"
              aria-label="Tipo de oportunidade"
              className="w-full flex-wrap justify-start gap-x-6 gap-y-1 border-b group-data-horizontal/tabs:h-auto"
            >
              {ABAS.map((a) => (
                <Dica key={a.valor} texto={a.dica}>
                  <TabsTrigger
                    value={a.valor}
                    className="group/aba flex-none px-0 py-2.5"
                  >
                  {a.rotulo}
                  <span className="tnum rounded-full bg-pill px-1.5 text-xs font-medium text-muted-foreground group-data-active/aba:bg-ink group-data-active/aba:text-on-ink">
                    {contagens[a.valor]}
                  </span>
                  </TabsTrigger>
                </Dica>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex w-full flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted-foreground">Filtrar por</span>
            <Dica texto="Digite parte do nome do cliente, da frente ou do motivo do alerta">
            <Input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              name="busca"
              autoComplete="off"
              placeholder="Buscar cliente, frente ou motivo…"
              aria-label="Buscar oportunidades"
              className="w-full sm:w-64"
            />
            </Dica>
            <Select value={setor} onValueChange={setSetor}>
              <Dica texto="Mostrar só os alertas de um setor da agência">
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filtrar por setor"
              >
                <SelectValue />
              </SelectTrigger>
              </Dica>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {setoresDasFrentes(frentes).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={ordem}
              onValueChange={(v) => setOrdem(v as Ordem)}
              disabled={agrupado}
            >
              <Dica
                texto={
                  agrupado
                    ? "Agrupado por cliente: o pior cliente vem primeiro"
                    : "Trocar a ordem da lista: por gravidade ou por nome do cliente"
                }
              >
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Ordenar por"
              >
                <SelectValue />
              </SelectTrigger>
              </Dica>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="gravidade">Ordem: gravidade</SelectItem>
                  <SelectItem value="cliente">Ordem: cliente (A a Z)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Dica texto="Juntar os alertas de cada cliente num bloco, do cliente em pior situação para o melhor">
              <Toggle
                variant="outline"
                pressed={agrupado}
                onPressedChange={setAgrupado}
                className="h-10 w-full px-5 sm:w-auto"
                data-agrupar
              >
                Agrupar por cliente
              </Toggle>
            </Dica>
          </div>
        </div>

        {clienteFoco && nomeFoco ? (
          <p
            data-foco-cliente
            className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
          >
            <span>
              Só os alertas de{" "}
              <b className="font-medium text-foreground">{nomeFoco}</b>
            </span>
            <Button
              size="sm"
              variant="outline"
              dica="Voltar a mostrar os alertas de todos os clientes"
              onClick={() => atualizarUrl({ cliente: null })}
            >
              Ver todos os clientes
            </Button>
          </p>
        ) : null}

        <div ref={lista} data-entra className="relative">
        {oportunidades.length === 0 ? (
          <Empty className="rounded-lg bg-card py-12">
            <EmptyHeader>
              <EmptyTitle>Carteira em dia</EmptyTitle>
              <EmptyDescription>
                Nenhuma frente está atrasada e nenhuma aprovação está travada.
                Registre ações ou faça um check-up para o Radar recalcular.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm" variant="outline" dica="Revisar as datas de um cliente para o Radar recalcular">
                <Link href="/checkup">Fazer check-up</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : visiveis.length === 0 ? (
          <SemResultados
            titulo="Nenhuma oportunidade com esses filtros"
            descricao="Tente outro termo, outro setor ou volte para a aba Todas."
            onLimpar={filtrando ? limpar : undefined}
          />
        ) : (
          agrupado ? (
            <ul className="flex flex-col gap-4" data-lista-agrupada>
              {grupos.map((g) => (
                <GrupoDoCliente
                  key={g.cliente.id}
                  grupo={g}
                  frentePorId={frentePorId}
                  atribuicaoDe={atribuicaoDe}
                  tituloAcaoDe={tituloAcaoDe}
                  onVerProposta={abrirProposta}
                  onRegistrarAcao={setAcaoAlvo}
                />
              ))}
            </ul>
          ) : (
          <div className="flex flex-col gap-6">
            {criticas.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {criticas.map((o, i) => {
                  const cliente = clientePorId.get(o.clientId)
                  const frente = frentePorId.get(o.frenteId)
                  if (!cliente || !frente) return null
                  return (
                    <OportunidadeCheia
                      key={o.id}
                      oportunidade={o}
                      cliente={cliente}
                      frente={frente}
                      atribuicao={atribuicaoDe(o.id)}
                      tituloAcao={tituloAcaoDe(o)}
                      onVerProposta={abrirProposta}
                      onRegistrarAcao={setAcaoAlvo}
                      destaque={i === 0}
                      maisAlertas={(alertasDoCliente.get(o.clientId) ?? 1) - 1}
                      onVerCliente={verCliente}
                    />
                  )
                })}
              </ul>
            ) : null}
            {demais.length > 0 ? (
              <ul className="divide-y overflow-hidden rounded-lg bg-card">
                {demais.map((o) => {
                  const cliente = clientePorId.get(o.clientId)
                  const frente = frentePorId.get(o.frenteId)
                  if (!cliente || !frente) return null
                  return (
                    <OportunidadeLinha
                      key={o.id}
                      oportunidade={o}
                      cliente={cliente}
                      frente={frente}
                      atribuicao={atribuicaoDe(o.id)}
                      tituloAcao={tituloAcaoDe(o)}
                      onVerProposta={abrirProposta}
                      onRegistrarAcao={setAcaoAlvo}
                      maisAlertas={(alertasDoCliente.get(o.clientId) ?? 1) - 1}
                      onVerCliente={verCliente}
                    />
                  )
                })}
              </ul>
            ) : null}
          </div>
          )
        )}
        </div>

        {filtrando ? (
          <p
            className="tnum py-4 text-sm text-muted-foreground"
            aria-live="polite"
          >
            Mostrando{" "}
            <b className="font-medium text-foreground">{visiveis.length}</b> de{" "}
            {n} oportunidades
          </p>
        ) : null}
      </section>

      {clienteDaAcao ? (
        <AcaoDialog
          aberto={acaoAlvo !== null}
          onOpenChange={(v) => {
            if (!v) setAcaoAlvo(null)
          }}
          cliente={clienteDaAcao}
          frentes={frentesDaAcao}
          frenteInicial={acaoAlvo?.frenteId}
          hoje={hoje}
          sugerirTitulo
        />
      ) : null}

      <ProposalDialog
        aberto={dialogoAberto}
        oportunidade={aberta}
        cliente={aberta ? clientePorId.get(aberta.clientId) : undefined}
        frente={aberta ? frentePorId.get(aberta.frenteId) : undefined}
        tituloAcao={aberta ? tituloAcaoDe(aberta) : undefined}
        onClose={() => setDialogoAberto(false)}
        devolverFoco={() => gatilho.current}
      />
    </div>
  )
}

export function RadarView() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <ComDados rows={3}>
        <Conteudo />
      </ComDados>
    </Suspense>
  )
}
