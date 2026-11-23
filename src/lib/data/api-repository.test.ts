import { describe, expect, it, vi } from "vitest"

import { montarGabarito as buildSeed } from "./gabarito-fixture"
import { criarApiRepository } from "./api-repository"
import { ErroApi } from "./repository"

function envelope(dados: unknown, status = 200) {
  return new Response(JSON.stringify({ ok: true, dados }), { status })
}
function erro(status: number, codigo: string, mensagem: string) {
  return new Response(JSON.stringify({ ok: false, erro: { codigo, mensagem } }), { status })
}

describe("apiRepository (fetch aos endpoints granulares)", () => {
  it("carregar: GET /api/radar sem cache", async () => {
    const seed = buildSeed()
    const f = vi.fn(async () => envelope(seed))
    const snap = await criarApiRepository(f).carregar()
    expect(snap.clients).toHaveLength(10)
    expect(f).toHaveBeenCalledWith(
      "/api/radar",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    )
  })

  it("cada operação usa o método, a URL e o corpo certos", async () => {
    const f = vi.fn(async () => envelope({}))
    const repo = criarApiRepository(f)
    await repo.registrarAcao({
      id: "acao-1",
      clientId: "c",
      frenteId: "f",
      titulo: "T",
      data: "2026-11-13",
      status: "concluida",
      origem: "manual",
    })
    await repo.atualizarStatusAcao("acao-1", "em_andamento")
    await repo.salvarCheckup({ id: "chk-1", clientId: "c", data: "2026-11-13", entradas: [] })
    await repo.atualizarFrente("google-ads", { prazoDias: 40, criticoAposDias: 80 })
    await repo.atribuir({ oportunidadeId: "parada:c:f", setor: "Mídia paga", data: "2026-11-13", texto: "x" })
    await repo.atualizarConfiguracao({ limiteAprovacaoDias: 7 })
    await repo.importar(buildSeed())
    await repo.resetar()

    const chamadas = f.mock.calls as unknown as Array<[string, RequestInit]>
    const resumo = chamadas.map(([url, init]) => `${init.method} ${url}`)
    expect(resumo).toEqual([
      "POST /api/radar/acoes",
      "PATCH /api/radar/acoes/acao-1",
      "POST /api/radar/checkups",
      "PUT /api/radar/frentes/google-ads",
      "POST /api/radar/atribuicoes",
      "PUT /api/radar/configuracao",
      "POST /api/radar/importar",
      "POST /api/radar/resetar",
    ])
    // registrarAcao envia só os campos aceitos pelo servidor (sem `origem`).
    expect(JSON.parse(chamadas[0][1].body as string)).toEqual({
      id: "acao-1",
      clientId: "c",
      frenteId: "f",
      titulo: "T",
      data: "2026-11-13",
      status: "concluida",
    })
    expect(JSON.parse(chamadas[1][1].body as string)).toEqual({ status: "em_andamento" })
    expect(chamadas[7][1].body).toBeUndefined()
  })

  it("o id na URL é escapado", async () => {
    const f = vi.fn(async () => envelope({}))
    await criarApiRepository(f).atualizarStatusAcao("a/b?x", "concluida")
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("/api/radar/acoes/a%2Fb%3Fx")
  })

  it("erro da API vira ErroApi com status e código", async () => {
    const repo = criarApiRepository(async () => erro(503, "BANCO_NAO_CONFIGURADO", "Banco de dados não configurado."))
    await expect(repo.carregar()).rejects.toMatchObject({
      name: "ErroApi",
      status: 503,
      codigo: "BANCO_NAO_CONFIGURADO",
    })
  })

  it("falha de rede vira ErroApi REDE", async () => {
    const repo = criarApiRepository(async () => {
      throw new TypeError("Failed to fetch")
    })
    const e = await repo.carregar().catch((x: unknown) => x)
    expect(e).toBeInstanceOf(ErroApi)
    expect(e).toMatchObject({ codigo: "REDE", status: 0 })
  })

  it("resposta que não é JSON (ex.: página de erro) => RESPOSTA_INVALIDA", async () => {
    const repo = criarApiRepository(async () => new Response("<html>502</html>", { status: 502 }))
    await expect(repo.carregar()).rejects.toMatchObject({ codigo: "RESPOSTA_INVALIDA", status: 502 })
  })

  it("snapshot com formato inesperado é recusado", async () => {
    const repo = criarApiRepository(async () => envelope({ clients: [] }))
    await expect(repo.carregar()).rejects.toMatchObject({ codigo: "RESPOSTA_INVALIDA" })
  })
})
