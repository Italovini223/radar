import type { Acao, RadarSnapshot } from "../domain/types"
import { ErroApi, type RadarRepository } from "./repository"

const BASE = "/api/radar"

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

interface Envelope {
  ok?: boolean
  dados?: unknown
  erro?: { codigo?: string; mensagem?: string }
}

/**
 * Repositório HTTP: chama os route handlers do Next (que falam com o Supabase
 * no servidor). Erros viram `ErroApi` com status e código estáveis.
 */
export function criarApiRepository(
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
  base = BASE
): RadarRepository {
  async function chamar<T>(
    caminho: string,
    metodo: "GET" | "POST" | "PUT" | "PATCH",
    corpo?: unknown
  ): Promise<T> {
    let resposta: Response
    try {
      resposta = await fetchImpl(`${base}${caminho}`, {
        method: metodo,
        cache: "no-store",
        headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
    } catch {
      throw new ErroApi(0, "REDE", "Sem conexão com o servidor.")
    }
    let envelope: Envelope | null = null
    try {
      envelope = (await resposta.json()) as Envelope
    } catch {
      envelope = null
    }
    if (!resposta.ok || !envelope || envelope.ok !== true) {
      throw new ErroApi(
        resposta.status,
        envelope?.erro?.codigo ?? "RESPOSTA_INVALIDA",
        envelope?.erro?.mensagem ?? "Resposta inesperada do servidor."
      )
    }
    return envelope.dados as T
  }

  return {
    async carregar() {
      const snap = await chamar<RadarSnapshot>("", "GET")
      if (!snap || !Array.isArray(snap.clients) || !Array.isArray(snap.frentes) || !Array.isArray(snap.acoes)) {
        throw new ErroApi(200, "RESPOSTA_INVALIDA", "Resposta inesperada do servidor.")
      }
      return snap
    },
    async registrarAcao(a: Acao) {
      await chamar("/acoes", "POST", {
        id: a.id,
        clientId: a.clientId,
        frenteId: a.frenteId,
        titulo: a.titulo,
        data: a.data,
        status: a.status,
        ...(a.responsavel ? { responsavel: a.responsavel } : {}),
      })
    },
    async atualizarStatusAcao(id, status) {
      await chamar(`/acoes/${encodeURIComponent(id)}`, "PATCH", { status })
    },
    salvarCheckup(input) {
      return chamar("/checkups", "POST", input)
    },
    async atualizarFrente(id, campos) {
      await chamar(`/frentes/${encodeURIComponent(id)}`, "PUT", campos)
    },
    async atribuir(a) {
      await chamar("/atribuicoes", "POST", a)
    },
    atualizarConfiguracao(parcial) {
      return chamar("/configuracao", "PUT", parcial)
    },
    importar(dataset) {
      return chamar("/importar", "POST", dataset)
    },
    resetar() {
      return chamar("/resetar", "POST")
    },
  }
}

export const apiRepository: RadarRepository = criarApiRepository()
