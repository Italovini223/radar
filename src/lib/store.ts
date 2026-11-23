"use client"

import { create } from "zustand"
import { toast } from "sonner"

import { apiRepository } from "./data/api-repository"
import {
  CODIGO_BANCO_NAO_CONFIGURADO,
  ErroApi,
  type RadarRepository,
} from "./data/repository"
import { aplicarCheckup, novoId, type EntradaCheckup } from "./domain/checkup"
import { agoraDaConfiguracao, toISODate } from "./domain/rules"
import {
  CONFIGURACAO_PADRAO,
  type Acao,
  type Atribuicao,
  type Checkup,
  type Client,
  type Configuracao,
  type Contrato,
  type Frente,
  type Opportunity,
  type RadarSnapshot,
  type ResultadoAds,
  type Setor,
  type StatusAcao,
} from "./domain/types"

export interface RadarState extends RadarSnapshot {
  contratos: Contrato[]
  /** Falso até a primeira carga terminar (as telas mostram skeleton). */
  ready: boolean
  erro: string | null
  /** "Hoje" do app (ms), derivado da configuração (data de referência ou data real). */
  agora: number
  atualizarAgora: () => void
  iniciar: () => Promise<void>
  /** Reimporta a fixture de demonstração no servidor. true = deu certo. */
  resetarDemo: () => Promise<boolean>
  registrarAcao: (a: {
    clientId: string
    frenteId: string
    titulo: string
    data: string
    status: StatusAcao
  }) => Promise<boolean>
  atualizarStatusAcao: (id: string, status: StatusAcao) => Promise<boolean>
  salvarCheckup: (input: {
    clientId: string
    entradas: EntradaCheckup[]
    resultadoAds?: ResultadoAds
  }) => string[]
  setPrazo: (
    frenteId: string,
    prazoDias: number,
    criticoAposDias?: number
  ) => Promise<boolean>
  atribuir: (o: Opportunity, setor: Setor, texto: string) => Promise<boolean>
  atualizarConfiguracao: (parcial: Partial<Configuracao>) => Promise<boolean>
}

type Dados = Pick<
  RadarState,
  | "clients"
  | "frentes"
  | "acoes"
  | "checkups"
  | "atribuicoes"
  | "contratos"
  | "configuracao"
>

const vazio: Dados = {
  clients: [],
  frentes: [],
  acoes: [],
  checkups: [],
  atribuicoes: [],
  contratos: [],
  configuracao: CONFIGURACAO_PADRAO,
}

/** Mensagem em português para o estado de erro de carga (sem detalhes internos). */
export function mensagemDeCarga(e: unknown): string {
  if (e instanceof ErroApi) {
    if (e.codigo === CODIGO_BANCO_NAO_CONFIGURADO) {
      return "Banco de dados não configurado. O servidor está sem as credenciais do banco; avise quem administra o Radar."
    }
    if (e.codigo === "REDE") {
      return "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo."
    }
  }
  return "Não foi possível carregar os dados do servidor. Tente de novo em instantes."
}

/** Mensagem curta de falha ao gravar uma alteração. */
export function mensagemDeGravacao(e: unknown): string {
  if (e instanceof ErroApi) {
    if (e.codigo === CODIGO_BANCO_NAO_CONFIGURADO) {
      return "Banco de dados não configurado."
    }
    if (e.codigo === "REDE") return "Sem conexão com o servidor."
    if (e.status >= 400 && e.status < 500) return e.message
  }
  return "Erro no servidor."
}

const MSG_BANCO_VAZIO =
  "O banco de dados ainda está vazio. Use “Resetar dados de demonstração” para carregar os dados de exemplo."

/**
 * Store OTIMISTA: aplica a mudança na hora, grava no servidor (em fila, na
 * mesma ordem) e, se falhar, desfaz só aquela mudança e avisa com toast.
 * A fonte de verdade é o servidor; não há persistência local.
 */
export function criarRadarStore(repo: RadarRepository) {
  // As gravações vão ao servidor uma de cada vez, na ordem em que o usuário agiu.
  let fila: Promise<unknown> = Promise.resolve()
  const enfileirar = <T,>(fn: () => Promise<T>): Promise<T> => {
    const p = fila.then(fn)
    fila = p.catch(() => undefined)
    return p
  }
  let carregando: Promise<void> | null = null

  return create<RadarState>()((set, get) => {
    const agoraDe = (c: Configuracao) =>
      agoraDaConfiguracao(c, new Date()).getTime()

    /**
     * `otimista` aplica já; `reverter` desfaz só esta mudança (sem apagar
     * mudanças posteriores); `chamar` grava no servidor.
     */
    async function mutar<T = void>(args: {
      otimista: () => void
      reverter: () => void
      chamar: () => Promise<T>
      aoSucesso?: (r: T) => void
      falha: string
    }): Promise<boolean> {
      args.otimista()
      try {
        const r = await enfileirar(args.chamar)
        args.aoSucesso?.(r)
        return true
      } catch (e) {
        args.reverter()
        toast.error(args.falha, {
          description: `${mensagemDeGravacao(e)} A alteração foi desfeita.`,
        })
        return false
      }
    }

    return {
      ...vazio,
      ready: false,
      erro: null,
      agora: 0,

      atualizarAgora: () => set((s) => ({ agora: agoraDe(s.configuracao) })),

      iniciar: async () => {
        if (carregando) return carregando
        carregando = (async () => {
          try {
            const snap = await repo.carregar()
            const vazioNoBanco =
              snap.clients.length === 0 && snap.frentes.length === 0
            set({
              ...snap,
              contratos: snap.contratos ?? [],
              ready: true,
              erro: vazioNoBanco ? MSG_BANCO_VAZIO : null,
              agora: agoraDe(snap.configuracao),
            })
          } catch (e) {
            // Sem fallback silencioso para localStorage: mostra o erro.
            set({ ready: true, agora: Date.now(), erro: mensagemDeCarga(e) })
          } finally {
            carregando = null
          }
        })()
        return carregando
      },

      resetarDemo: async () => {
        try {
          const snap = await enfileirar(() => repo.resetar())
          set({
            ...snap,
            contratos: snap.contratos ?? [],
            ready: true,
            erro: null,
            agora: agoraDe(snap.configuracao),
          })
          return true
        } catch (e) {
          toast.error("Não foi possível resetar os dados.", {
            description: mensagemDeGravacao(e),
          })
          return false
        }
      },

      registrarAcao: (a) => {
        const nova: Acao = {
          id: novoId("acao"),
          ...a,
          aguardandoDesde:
            a.status === "aguardando_aprovacao" ? a.data : undefined,
          origem: "manual",
        }
        return mutar({
          otimista: () => set((s) => ({ acoes: [...s.acoes, nova] })),
          reverter: () =>
            set((s) => ({ acoes: s.acoes.filter((x) => x.id !== nova.id) })),
          chamar: () => repo.registrarAcao(nova),
          falha: "Não foi possível registrar a ação.",
        })
      },

      atualizarStatusAcao: async (id, status) => {
        const antes = get().acoes.find((a) => a.id === id)
        if (!antes) return false
        return mutar({
          otimista: () =>
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
          reverter: () =>
            set((s) => ({
              acoes: s.acoes.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      status: antes.status,
                      aguardandoDesde: antes.aguardandoDesde,
                    }
                  : a
              ),
            })),
          chamar: () => repo.atualizarStatusAcao(id, status),
          falha: "Não foi possível atualizar a ação.",
        })
      },

      salvarCheckup: ({ clientId, entradas, resultadoAds }) => {
        const { acoes, frentes, agora } = get()
        const resultado = aplicarCheckup(acoes, frentes, clientId, entradas)
        const registro: Checkup = {
          id: novoId("checkup"),
          clientId,
          data: toISODate(new Date(agora)),
          resultadoAds,
        }
        const antesDoCliente = acoes.filter((a) => a.clientId === clientId)
        const outras = (lista: Acao[]) =>
          lista.filter((a) => a.clientId !== clientId)
        void mutar({
          otimista: () =>
            set((s) => ({
              acoes: resultado.acoes,
              checkups: [...s.checkups, registro],
            })),
          reverter: () =>
            set((s) => ({
              acoes: [...outras(s.acoes), ...antesDoCliente],
              checkups: s.checkups.filter((c) => c.id !== registro.id),
            })),
          chamar: () =>
            repo.salvarCheckup({
              id: registro.id,
              clientId,
              data: registro.data,
              entradas,
              resultadoAds,
            }),
          // O servidor gera os ids das ações: reconcilia com a versão dele.
          aoSucesso: (r) =>
            set((s) => ({ acoes: [...outras(s.acoes), ...r.acoes] })),
          falha: "Não foi possível salvar o check-up.",
        })
        return resultado.alteradas
      },

      setPrazo: async (frenteId, prazoDias, criticoAposDias) => {
        const antes = get().frentes.find((f) => f.id === frenteId)
        if (!antes) return false
        // Mantém o limite crítico se ele ainda faz sentido; senão, 2x o prazo.
        const critico =
          criticoAposDias ??
          (antes.criticoAposDias > prazoDias
            ? antes.criticoAposDias
            : prazoDias * 2)
        const atualizar = (prazo: number, crit: number) =>
          set((s) => ({
            frentes: s.frentes.map((f) =>
              f.id === frenteId
                ? { ...f, prazoDias: prazo, criticoAposDias: crit }
                : f
            ),
          }))
        return mutar({
          otimista: () => atualizar(prazoDias, critico),
          reverter: () => atualizar(antes.prazoDias, antes.criticoAposDias),
          chamar: () =>
            repo.atualizarFrente(frenteId, {
              prazoDias,
              criticoAposDias: critico,
            }),
          falha: "Não foi possível salvar o prazo.",
        })
      },

      atribuir: async (o, setor, texto) => {
        const antes = get().atribuicoes.find((x) => x.oportunidadeId === o.id)
        const atribuicao: Atribuicao = {
          oportunidadeId: o.id,
          setor,
          data: toISODate(new Date(get().agora)),
          texto,
        }
        const sem = (lista: Atribuicao[]) =>
          lista.filter((x) => x.oportunidadeId !== o.id)
        return mutar({
          otimista: () =>
            set((s) => ({ atribuicoes: [...sem(s.atribuicoes), atribuicao] })),
          reverter: () =>
            set((s) => ({
              atribuicoes: antes
                ? [...sem(s.atribuicoes), antes]
                : sem(s.atribuicoes),
            })),
          chamar: () => repo.atribuir(atribuicao),
          falha: "Não foi possível registrar a atribuição.",
        })
      },

      atualizarConfiguracao: async (parcial) => {
        const antes = get().configuracao
        const aplicar = (c: Configuracao) =>
          set({ configuracao: c, agora: agoraDe(c) })
        return mutar({
          otimista: () => aplicar({ ...antes, ...parcial }),
          reverter: () => aplicar(antes),
          chamar: () => repo.atualizarConfiguracao(parcial),
          aoSucesso: (c) => aplicar(c),
          falha: "Não foi possível salvar a configuração.",
        })
      },
    }
  })
}

export const useRadarStore = criarRadarStore(apiRepository)

export type { Client, Frente }
