import { beforeEach, describe, expect, it, vi } from "vitest"

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock("sonner", () => ({ toast: toasts }))

// O store singleton usa o repositório da API: aqui ele é um fake em memória.
const repo = vi.hoisted(() => ({
  registrar: undefined as undefined | (() => Promise<void>),
}))
vi.mock("@/lib/data/api-repository", async () => {
  const { montarGabarito: buildSeed } = await import("@/lib/data/gabarito-fixture")
  return {
    apiRepository: {
      carregar: async () => buildSeed(),
      registrarAcao: () => (repo.registrar ? repo.registrar() : Promise.resolve()),
      atualizarStatusAcao: async () => {},
      salvarCheckup: async (i: { id: string; clientId: string; data: string }) => ({
        alteradas: [],
        acoes: [],
        checkup: { id: i.id, clientId: i.clientId, data: i.data },
      }),
      atualizarFrente: async () => {},
      atribuir: async () => {},
      atualizarConfiguracao: async (p: object) => ({ ...(await buildSeed()).configuracao, ...p }),
      importar: async (d: unknown) => d,
      resetar: async () => buildSeed(),
    },
  }
})

import { registrarAcaoComResumo, salvarCheckupComResumo, useConfirmacaoStore } from "@/lib/confirmacao"
import { useRadarStore } from "@/lib/store"

const googleAurora = {
  clientId: "aurora-moda",
  frenteId: "google-ads",
  titulo: "Otimização de Google Ads feita hoje",
  data: "2026-11-13",
  status: "concluida" as const,
}

beforeEach(async () => {
  repo.registrar = undefined
  toasts.error.mockClear()
  useConfirmacaoStore.setState({ resumo: null, numero: 0 })
  await useRadarStore.getState().iniciar()
})

describe("confirmação pós-ação (store)", () => {
  it("registrar a ação do Google Ads da Aurora: publica 'alerta resolvido' e a próxima oportunidade", async () => {
    expect(await registrarAcaoComResumo(googleAurora)).toBe(true)
    const r = useConfirmacaoStore.getState().resumo
    expect(r?.clientId).toBe("aurora-moda")
    expect(r?.resolvidas.map((o) => o.id)).toEqual(["parada:aurora-moda:google-ads"])
    expect(r?.proxima?.id).toBe("parada:aurora-moda:crm")
    // O Radar já refletiu a ação (alerta some do estado do store).
    expect(
      useRadarStore.getState().acoes.some((a) => a.titulo === googleAurora.titulo)
    ).toBe(true)
  })

  it("a confirmação aparece na hora, antes de o servidor responder", async () => {
    let liberar!: () => void
    repo.registrar = () => new Promise<void>((r) => (liberar = r))
    const p = registrarAcaoComResumo(googleAurora)
    expect(useConfirmacaoStore.getState().resumo?.resolvidas).toHaveLength(1)
    await new Promise((r) => setTimeout(r, 0))
    liberar()
    expect(await p).toBe(true)
    expect(useConfirmacaoStore.getState().resumo).not.toBeNull()
  })

  it("se o servidor recusar, a ação é desfeita e a confirmação some", async () => {
    repo.registrar = () => Promise.reject(new Error("falhou"))
    expect(await registrarAcaoComResumo(googleAurora)).toBe(false)
    expect(useConfirmacaoStore.getState().resumo).toBeNull()
    expect(toasts.error).toHaveBeenCalled()
    expect(
      useRadarStore.getState().acoes.some((a) => a.titulo === googleAurora.titulo)
    ).toBe(false)
  })

  it("fechar só fecha a confirmação indicada", () => {
    const { mostrar, fechar } = useConfirmacaoStore.getState()
    const resumo = {
      clientId: "x",
      frenteIds: [],
      status: "concluida" as const,
      resolvidas: [],
      semEfeito: [],
      proxima: null,
      pendentes: 0,
    }
    const n1 = mostrar(resumo)
    mostrar(resumo)
    fechar(n1) // a primeira já foi substituída: não fecha a atual
    expect(useConfirmacaoStore.getState().resumo).not.toBeNull()
    fechar()
    expect(useConfirmacaoStore.getState().resumo).toBeNull()
  })

  it("check-up que muda uma frente publica o resumo; sem mudança não publica", () => {
    expect(
      salvarCheckupComResumo({
        clientId: "aurora-moda",
        entradas: [{ frenteId: "google-ads", data: "2026-11-12" }],
      })
    ).toEqual(["google-ads"])
    expect(useConfirmacaoStore.getState().resumo?.resolvidas).toHaveLength(1)
    useConfirmacaoStore.getState().fechar()
    expect(
      salvarCheckupComResumo({
        clientId: "techmania",
        entradas: [{ frenteId: "crm", data: "" }],
      })
    ).toEqual([])
    expect(useConfirmacaoStore.getState().resumo).toBeNull()
  })
})
