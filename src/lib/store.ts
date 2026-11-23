"use client"

import {
  create,
  type Mutate,
  type StoreApi,
  type UseBoundStore,
} from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"

import { aplicarCheckup, novoId, type EntradaCheckup } from "./domain/checkup"
import { toISODate } from "./domain/rules"
import {
  CONFIGURACAO_PADRAO,
  type Acao,
  type Atribuicao,
  type Checkup,
  type Client,
  type Frente,
  type Opportunity,
  type RadarSnapshot,
  type ResultadoAds,
  type Setor,
  type StatusAcao,
} from "./domain/types"
import {
  localStorageRepository,
  type RadarRepository,
} from "./data/repository"
import { buildSeed } from "./data/seed"

type Persistido = RadarSnapshot

interface RadarState extends RadarSnapshot {
  /** Falso até a hidratação terminar (as telas mostram skeleton). */
  ready: boolean
  erro: string | null
  /** "Hoje" do app (ms). Não persiste; "Atualizar radar" recalcula. */
  agora: number
  atualizarAgora: () => void
  iniciar: () => Promise<void>
  resetarDemo: () => void
  registrarAcao: (a: {
    clientId: string
    frenteId: string
    titulo: string
    data: string
    status: StatusAcao
  }) => void
  atualizarStatusAcao: (id: string, status: StatusAcao) => void
  salvarCheckup: (input: {
    clientId: string
    entradas: EntradaCheckup[]
    resultadoAds?: ResultadoAds
  }) => string[]
  setPrazo: (frenteId: string, prazoDias: number) => void
  atribuir: (o: Opportunity, setor: Setor, texto: string) => void
}

/** Adapta o repositório (interface trocável) ao storage do zustand/persist. */
function storageDoRepositorio(
  repo: RadarRepository,
  podeSalvar: () => boolean
): PersistStorage<Persistido> {
  return {
    getItem: async () => {
      const dados = await repo.load()
      return dados ? { state: dados, version: 1 } : null
    },
    setItem: async (_nome, valor) => {
      // Nunca grava antes da hidratação: o estado inicial vazio apagaria os
      // dados salvos no navegador.
      if (!podeSalvar()) return
      await repo.save(valor.state)
    },
    removeItem: async () => {
      await repo.clear()
    },
  }
}

/** Último erro de leitura do repositório (preenchido por onRehydrateStorage). */
let erroDeLeitura: string | null = null

const vazio: RadarSnapshot = {
  clients: [],
  frentes: [],
  acoes: [],
  checkups: [],
  atribuicoes: [],
  contratos: [],
  configuracao: CONFIGURACAO_PADRAO,
}

export const useRadarStore: UseBoundStore<
  Mutate<StoreApi<RadarState>, [["zustand/persist", Persistido]]>
> = create<RadarState>()(
  persist(
    (set, get) => ({
      ...vazio,
      ready: false,
      erro: null,
      agora: 0,
      atualizarAgora: () => set({ agora: Date.now() }),

      iniciar: async () => {
        try {
          erroDeLeitura = null
          await useRadarStore.persist.rehydrate()
          // Falha de leitura é capturada por onRehydrateStorage.
          if (erroDeLeitura) {
            set({ ready: true, agora: Date.now(), erro: erroDeLeitura })
            return
          }
          if (get().frentes.length === 0) set(buildSeed())
          set({ ready: true, agora: Date.now(), erro: null })
        } catch (e) {
          set({
            ready: true,
            agora: Date.now(),
            erro:
              e instanceof Error
                ? e.message
                : "Não foi possível carregar os dados do navegador.",
          })
        }
      },

      resetarDemo: () => set({ ...buildSeed(), erro: null }),

      registrarAcao: (a) =>
        set((s) => {
          const nova: Acao = {
            id: novoId("acao"),
            ...a,
            aguardandoDesde:
              a.status === "aguardando_aprovacao" ? a.data : undefined,
            origem: "manual",
          }
          return { acoes: [...s.acoes, nova] }
        }),

      atualizarStatusAcao: (id, status) =>
        set((s) => ({
          acoes: s.acoes.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  aguardandoDesde:
                    status === "aguardando_aprovacao"
                      ? (a.aguardandoDesde ?? a.data)
                      : undefined,
                }
              : a
          ),
        })),

      salvarCheckup: ({ clientId, entradas, resultadoAds }) => {
        const { acoes, frentes } = get()
        const resultado = aplicarCheckup(acoes, frentes, clientId, entradas)
        const registro: Checkup = {
          id: novoId("checkup"),
          clientId,
          data: toISODate(new Date()),
          resultadoAds,
        }
        set((s) => ({
          acoes: resultado.acoes,
          checkups: [...s.checkups, registro],
        }))
        return resultado.alteradas
      },

      setPrazo: (frenteId, prazoDias) =>
        set((s) => ({
          frentes: s.frentes.map((f) =>
            f.id === frenteId ? { ...f, prazoDias } : f
          ),
        })),

      atribuir: (o, setor, texto) =>
        set((s) => {
          const atribuicao: Atribuicao = {
            oportunidadeId: o.id,
            setor,
            data: toISODate(new Date()),
            texto,
          }
          return {
            atribuicoes: [
              ...s.atribuicoes.filter((x) => x.oportunidadeId !== o.id),
              atribuicao,
            ],
          }
        }),
    }),
    {
      name: "weethub-radar",
      version: 1,
      skipHydration: true,
      onRehydrateStorage: () => (_estado, erro) => {
        if (erro) {
          erroDeLeitura =
            erro instanceof Error
              ? erro.message
              : "Não foi possível carregar os dados do navegador."
        }
      },
      storage: storageDoRepositorio(
        localStorageRepository,
        () => {
          const { ready, erro } = useRadarStore.getState()
          return ready && !erro
        }
      ),
      partialize: (s): Persistido => ({
        clients: s.clients,
        frentes: s.frentes,
        acoes: s.acoes,
        checkups: s.checkups,
        atribuicoes: s.atribuicoes,
        contratos: s.contratos,
        configuracao: s.configuracao,
      }),
    }
  )
)

export type { Client, Frente }
