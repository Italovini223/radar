import { beforeEach, describe, expect, it, vi } from "vitest"

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock("sonner", () => ({ toast: toasts }))

import { montarGabarito as buildSeed } from "@/lib/data/gabarito-fixture"
import { ErroApi, type RadarRepository } from "@/lib/data/repository"
import type { Opportunity, RadarSnapshot } from "@/lib/domain/types"

import { criarRadarStore } from "./store"

/** Promessa controlável, para observar o estado ANTES de o servidor responder. */
function adiavel<T = void>() {
  let resolver!: (v: T) => void
  let rejeitar!: (e: unknown) => void
  const promessa = new Promise<T>((res, rej) => {
    resolver = res
    rejeitar = rej
  })
  return { promessa, resolver, rejeitar }
}

function repoFalso(sobrescrever: Partial<RadarRepository> = {}) {
  const seed = buildSeed()
  const repo: RadarRepository = {
    carregar: vi.fn(async () => structuredClone(seed)),
    registrarAcao: vi.fn(async () => {}),
    atualizarStatusAcao: vi.fn(async () => {}),
    salvarCheckup: vi.fn(async (i) => ({
      alteradas: [],
      acoes: [],
      checkup: { id: i.id, clientId: i.clientId, data: i.data },
    })),
    atualizarFrente: vi.fn(async () => {}),
    atribuir: vi.fn(async () => {}),
    atualizarConfiguracao: vi.fn(async (p) => ({ ...seed.configuracao, ...p })),
    importar: vi.fn(async (d) => d),
    resetar: vi.fn(async () => structuredClone(seed)),
    ...sobrescrever,
  }
  return repo
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const falhaRede = () => new ErroApi(0, "REDE", "Sem conexão com o servidor.")
const acaoNova = {
  clientId: "aurora-moda",
  frenteId: "google-ads",
  titulo: "Otimização de Google Ads feita hoje",
  data: "2026-11-13",
  status: "concluida" as const,
}

beforeEach(() => {
  toasts.error.mockClear()
  toasts.success.mockClear()
})

describe("hidratação (GET /api/radar)", () => {
  it("carrega o snapshot do servidor; 'hoje' vem da configuração (2026-11-13)", async () => {
    const store = criarRadarStore(repoFalso())
    expect(store.getState().ready).toBe(false)
    await store.getState().iniciar()
    const s = store.getState()
    expect(s.ready).toBe(true)
    expect(s.erro).toBeNull()
    expect(s.clients).toHaveLength(10)
    expect(s.contratos).toHaveLength(39)
    expect(new Date(s.agora).toISOString().slice(0, 10)).toBe("2026-11-13")
  })

  it("banco não configurado (503): estado de erro claro, SEM cair em localStorage", async () => {
    const repo = repoFalso({
      carregar: async () => {
        throw new ErroApi(503, "BANCO_NAO_CONFIGURADO", "Banco de dados não configurado.")
      },
    })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const s = store.getState()
    expect(s.ready).toBe(true)
    expect(s.erro).toMatch(/^Banco de dados não configurado/)
    expect(s.clients).toEqual([])
    expect(s.agora).toBeGreaterThan(0)
  })

  it("sem rede e erro 500: mensagens genéricas em português, sem detalhe interno", async () => {
    const semRede = criarRadarStore(repoFalso({ carregar: async () => { throw falhaRede() } }))
    await semRede.getState().iniciar()
    expect(semRede.getState().erro).toMatch(/conexão/)
    const quebrado = criarRadarStore(
      repoFalso({ carregar: async () => { throw new ErroApi(500, "ERRO_INTERNO", "stack interno") } })
    )
    await quebrado.getState().iniciar()
    expect(quebrado.getState().erro).not.toMatch(/stack interno/)
    expect(quebrado.getState().erro).toMatch(/Não foi possível carregar/)
  })

  it("banco vazio: não é erro; marca 'vazio' para oferecer carregar a demonstração", async () => {
    const vazio: RadarSnapshot = { ...buildSeed(), clients: [], frentes: [], acoes: [], contratos: [] }
    const store = criarRadarStore(repoFalso({ carregar: async () => vazio }))
    await store.getState().iniciar()
    expect(store.getState()).toMatchObject({ ready: true, erro: null, vazio: true })
    // Carregar a demonstração preenche e desliga o estado vazio.
    expect(await store.getState().resetarDemo()).toBe(true)
    expect(store.getState().vazio).toBe(false)
    expect(store.getState().clients).toHaveLength(10)
  })

  it("tentar de novo depois do erro carrega normalmente", async () => {
    const carregar = vi
      .fn<RadarRepository["carregar"]>()
      .mockRejectedValueOnce(falhaRede())
      .mockResolvedValueOnce(buildSeed())
    const store = criarRadarStore(repoFalso({ carregar }))
    await store.getState().iniciar()
    expect(store.getState().erro).not.toBeNull()
    await store.getState().iniciar()
    expect(store.getState().erro).toBeNull()
    expect(store.getState().clients).toHaveLength(10)
  })
})

describe("registrarAcao otimista", () => {
  it("aplica na hora (antes de o servidor responder) e mantém no sucesso", async () => {
    const d = adiavel()
    const repo = repoFalso({ registrarAcao: vi.fn(() => d.promessa) })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const antes = store.getState().acoes.length

    const p = store.getState().registrarAcao(acaoNova)
    // Sem await do servidor: a tela já tem a ação.
    expect(store.getState().acoes).toHaveLength(antes + 1)
    d.resolver()
    expect(await p).toBe(true)
    expect(store.getState().acoes).toHaveLength(antes + 1)
    expect(repo.registrarAcao).toHaveBeenCalledWith(
      expect.objectContaining({ ...acaoNova, origem: "manual" })
    )
    expect(toasts.error).not.toHaveBeenCalled()
  })

  it("em falha, reverte e mostra toast de erro", async () => {
    const repo = repoFalso({ registrarAcao: async () => { throw falhaRede() } })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const antes = store.getState().acoes
    expect(await store.getState().registrarAcao(acaoNova)).toBe(false)
    expect(store.getState().acoes).toEqual(antes)
    expect(toasts.error).toHaveBeenCalledOnce()
    expect(toasts.error.mock.calls[0][1].description).toMatch(/desfeita/)
  })

  it("reverter uma falha não apaga uma mudança posterior que deu certo", async () => {
    const registrarAcao = vi
      .fn<RadarRepository["registrarAcao"]>()
      .mockRejectedValueOnce(falhaRede())
      .mockResolvedValueOnce(undefined)
    const store = criarRadarStore(repoFalso({ registrarAcao }))
    await store.getState().iniciar()
    const antes = store.getState().acoes.length
    const a = store.getState().registrarAcao({ ...acaoNova, titulo: "A (vai falhar)" })
    const b = store.getState().registrarAcao({ ...acaoNova, titulo: "B (vai dar certo)" })
    expect(store.getState().acoes).toHaveLength(antes + 2)
    expect(await a).toBe(false)
    expect(await b).toBe(true)
    const titulos = store.getState().acoes.map((x) => x.titulo)
    expect(titulos).toContain("B (vai dar certo)")
    expect(titulos).not.toContain("A (vai falhar)")
  })

  it("as gravações vão ao servidor uma de cada vez, na ordem da ação do usuário", async () => {
    const d1 = adiavel()
    const ordem: string[] = []
    const registrarAcao = vi.fn(async (a: { titulo: string }) => {
      ordem.push(`inicio ${a.titulo}`)
      if (a.titulo === "1") await d1.promessa
      ordem.push(`fim ${a.titulo}`)
    })
    const store = criarRadarStore(repoFalso({ registrarAcao }))
    await store.getState().iniciar()
    const p1 = store.getState().registrarAcao({ ...acaoNova, titulo: "1" })
    const p2 = store.getState().registrarAcao({ ...acaoNova, titulo: "2" })
    await tick()
    expect(ordem).toEqual(["inicio 1"]) // a 2 espera a 1
    d1.resolver()
    await Promise.all([p1, p2])
    expect(ordem).toEqual(["inicio 1", "fim 1", "inicio 2", "fim 2"])
  })
})

describe("demais operações otimistas", () => {
  it("atualizarStatusAcao: aplica, e em falha restaura status e aguardandoDesde", async () => {
    const id = "seed-bella-pele-materiais-aguardando-0"
    const repo = repoFalso({ atualizarStatusAcao: async () => { throw falhaRede() } })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const antes = store.getState().acoes.find((a) => a.id === id)
    expect(antes?.status).toBe("aguardando_aprovacao")
    const p = store.getState().atualizarStatusAcao(id, "concluida")
    expect(store.getState().acoes.find((a) => a.id === id)).toMatchObject({
      status: "concluida",
      aguardandoDesde: undefined,
    })
    expect(await p).toBe(false)
    expect(store.getState().acoes.find((a) => a.id === id)).toEqual(antes)
    expect(toasts.error).toHaveBeenCalled()
  })

  it("atualizarStatusAcao de id desconhecido não chama o servidor", async () => {
    const repo = repoFalso()
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    expect(await store.getState().atualizarStatusAcao("fantasma", "concluida")).toBe(false)
    expect(repo.atualizarStatusAcao).not.toHaveBeenCalled()
  })

  it("salvarCheckup: devolve as frentes alteradas na hora e reconcilia com as ações do servidor", async () => {
    const d = adiavel<Awaited<ReturnType<RadarRepository["salvarCheckup"]>>>()
    const repo = repoFalso({ salvarCheckup: vi.fn(() => d.promessa) })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const alteradas = store.getState().salvarCheckup({
      clientId: "aurora-moda",
      entradas: [{ frenteId: "google-ads", data: "2026-11-12" }],
      resultadoAds: "estavel",
    })
    expect(alteradas).toEqual(["google-ads"])
    const locais = store.getState().acoes.filter((a) => a.clientId === "aurora-moda")
    expect(locais.some((a) => a.origem === "checkup")).toBe(true)
    expect(store.getState().checkups.at(-1)).toMatchObject({
      clientId: "aurora-moda",
      data: "2026-11-13", // "hoje" do app (data de referência), não a data real
      resultadoAds: "estavel",
    })

    const doServidor = { ...locais.find((a) => a.origem === "checkup")!, id: "acao-do-servidor" }
    await tick()
    const chamada = (repo.salvarCheckup as ReturnType<typeof vi.fn>).mock.calls[0][0]
    d.resolver({
      alteradas: ["google-ads"],
      acoes: [...locais.filter((a) => a.origem !== "checkup"), doServidor],
      checkup: { id: chamada.id, clientId: "aurora-moda", data: chamada.data },
    })
    await tick()
    const ids = store.getState().acoes.map((a) => a.id)
    expect(ids).toContain("acao-do-servidor")
    expect(store.getState().acoes.filter((a) => a.origem === "checkup" && a.clientId === "aurora-moda")).toHaveLength(1)
  })

  it("salvarCheckup em falha: restaura as ações do cliente e remove o check-up", async () => {
    const repo = repoFalso({ salvarCheckup: async () => { throw falhaRede() } })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const antes = store.getState().acoes.filter((a) => a.clientId === "techmania").map((a) => a.id).sort()
    const nCheckups = store.getState().checkups.length
    // data mais antiga: apagaria o histórico localmente
    store.getState().salvarCheckup({
      clientId: "techmania",
      entradas: [{ frenteId: "google-ads", data: "2026-08-01" }],
    })
    await tick()
    await tick()
    const depois = store.getState().acoes.filter((a) => a.clientId === "techmania").map((a) => a.id).sort()
    expect(depois).toEqual(antes)
    expect(store.getState().checkups).toHaveLength(nCheckups)
    expect(toasts.error).toHaveBeenCalled()
  })

  it("setPrazo: ajusta o limite crítico quando necessário e reverte em falha", async () => {
    const atualizarFrente = vi
      .fn<RadarRepository["atualizarFrente"]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(falhaRede())
    const store = criarRadarStore(repoFalso({ atualizarFrente }))
    await store.getState().iniciar()
    const get = () => store.getState().frentes.find((f) => f.id === "google-ads")!
    expect(get()).toMatchObject({ prazoDias: 30, criticoAposDias: 60 })

    await store.getState().setPrazo("google-ads", 40) // crítico 60 > 40: mantém
    expect(get()).toMatchObject({ prazoDias: 40, criticoAposDias: 60 })
    expect(atualizarFrente).toHaveBeenLastCalledWith("google-ads", { prazoDias: 40, criticoAposDias: 60 })

    expect(await store.getState().setPrazo("google-ads", 100)).toBe(false) // falha: volta
    expect(get()).toMatchObject({ prazoDias: 40, criticoAposDias: 60 })
    expect(atualizarFrente).toHaveBeenLastCalledWith("google-ads", { prazoDias: 100, criticoAposDias: 200 })
  })

  it("atribuir: substitui a anterior e restaura a anterior em falha", async () => {
    const atribuir = vi
      .fn<RadarRepository["atribuir"]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(falhaRede())
    const store = criarRadarStore(repoFalso({ atribuir }))
    await store.getState().iniciar()
    const o = { id: "parada:aurora-moda:crm" } as Opportunity
    await store.getState().atribuir(o, "CRM & Automação", "primeira")
    expect(store.getState().atribuicoes).toHaveLength(1)
    expect(store.getState().atribuicoes[0].data).toBe("2026-11-13")
    expect(await store.getState().atribuir(o, "Mídia paga", "segunda")).toBe(false)
    expect(store.getState().atribuicoes).toEqual([
      expect.objectContaining({ setor: "CRM & Automação", texto: "primeira" }),
    ])
  })

  it("atualizarConfiguracao: recalcula 'hoje' e reverte em falha", async () => {
    const repo = repoFalso({
      atualizarConfiguracao: vi
        .fn<RadarRepository["atualizarConfiguracao"]>()
        .mockRejectedValueOnce(falhaRede()),
    })
    const store = criarRadarStore(repo)
    await store.getState().iniciar()
    const agoraAntes = store.getState().agora
    const p = store.getState().atualizarConfiguracao({ dataReferencia: "2026-12-01" })
    expect(new Date(store.getState().agora).toISOString().slice(0, 10)).toBe("2026-12-01")
    expect(await p).toBe(false)
    expect(store.getState().agora).toBe(agoraAntes)
    expect(store.getState().configuracao.dataReferencia).toBe("2026-11-13")
  })

  it("resetarDemo: troca tudo pelo snapshot do servidor; em falha mantém e avisa", async () => {
    const store = criarRadarStore(repoFalso())
    await store.getState().iniciar()
    await store.getState().registrarAcao(acaoNova)
    const extra = store.getState().acoes.length
    expect(await store.getState().resetarDemo()).toBe(true)
    expect(store.getState().acoes.length).toBe(extra - 1)
    expect(store.getState().erro).toBeNull()

    const falho = criarRadarStore(
      repoFalso({ resetar: async () => { throw new ErroApi(503, "BANCO_NAO_CONFIGURADO", "x") } })
    )
    await falho.getState().iniciar()
    expect(await falho.getState().resetarDemo()).toBe(false)
    expect(toasts.error).toHaveBeenCalled()
  })

  it("não usa localStorage: nenhuma persistência local", async () => {
    const setItem = vi.fn()
    vi.stubGlobal("localStorage", { getItem: vi.fn(), setItem, removeItem: vi.fn() })
    const store = criarRadarStore(repoFalso())
    await store.getState().iniciar()
    await store.getState().registrarAcao(acaoNova)
    expect(setItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
