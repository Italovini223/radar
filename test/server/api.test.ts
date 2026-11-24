import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { montarGabarito as buildSeed } from "@/lib/data/gabarito-fixture"
import type { Banco } from "@/lib/server/banco"
import { BancoNaoConfiguradoError, ErroBanco } from "@/lib/server/errors"
import { BancoFake } from "../support/banco-fake"

// Os route handlers chamam getBanco(); aqui ele devolve o fake (ou um erro).
// Os handlers de /resetar usam buildSeed() (a planilha real); aqui ele devolve
// a fixture sintética pequena. O dataset real é testado em planilha-servidor.test.ts.
vi.mock("@/lib/data/seed", async () => {
  const { montarGabarito } = await import("@/lib/data/gabarito-fixture")
  return { buildSeed: montarGabarito }
})

const estado = vi.hoisted(() => ({
  fornecer: (): unknown => {
    throw new Error("não configurado no teste")
  },
}))
vi.mock("@/lib/server/banco-instancia", () => ({
  getBanco: () => estado.fornecer() as Banco,
}))

import * as rAcoes from "@/app/api/radar/acoes/route"
import * as rAcaoId from "@/app/api/radar/acoes/[id]/route"
import * as rAtribuicoes from "@/app/api/radar/atribuicoes/route"
import * as rCheckups from "@/app/api/radar/checkups/route"
import * as rConfig from "@/app/api/radar/configuracao/route"
import * as rFrente from "@/app/api/radar/frentes/[id]/route"
import * as rImportar from "@/app/api/radar/importar/route"
import * as rRaiz from "@/app/api/radar/route"
import * as rResetar from "@/app/api/radar/resetar/route"

const URL_BASE = "http://localhost/api/radar"
const req = (caminho: string, metodo: string, corpo?: unknown, bruto?: string) =>
  new Request(`${URL_BASE}${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: bruto ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
  })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const json = async (r: Response) => (await r.json()) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

let banco: BancoFake
beforeEach(() => {
  banco = new BancoFake()
  estado.fornecer = () => banco
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe("GET /api/radar", () => {
  it("devolve o snapshot no envelope { ok, dados } e nunca é cacheado", async () => {
    await rResetar.POST()
    const r = await rRaiz.GET()
    expect(r.status).toBe(200)
    expect(r.headers.get("cache-control")).toBe("no-store")
    const corpo = await json(r)
    expect(corpo.ok).toBe(true)
    expect(corpo.dados.clients).toHaveLength(10)
    expect(corpo.dados.frentes).toHaveLength(8)
    expect(corpo.dados.contratos).toHaveLength(39)
    expect(corpo.dados.configuracao.dataReferencia).toBe("2026-11-13")
  })

  it("banco vazio: 200 com listas vazias", async () => {
    const corpo = await json(await rRaiz.GET())
    expect(corpo.dados.clients).toEqual([])
  })

  it("todas as rotas desligam o cache do Next (force-dynamic)", () => {
    for (const m of [rRaiz, rAcoes, rAcaoId, rAtribuicoes, rCheckups, rConfig, rFrente, rImportar, rResetar]) {
      expect(m.dynamic).toBe("force-dynamic")
    }
  })
})

describe("POST /api/radar/acoes", () => {
  beforeEach(async () => {
    await rResetar.POST()
  })
  const ok = {
    clientId: "aurora-moda",
    frenteId: "google-ads",
    titulo: "Otimização de Google Ads feita hoje",
    data: "2026-11-13",
    status: "concluida",
  }

  it("201 e persiste", async () => {
    const r = await rAcoes.POST(req("/acoes", "POST", ok))
    expect(r.status).toBe(201)
    const corpo = await json(r)
    expect(corpo).toMatchObject({ ok: true, dados: { clientId: "aurora-moda", origem: "manual" } })
    expect(banco.tabelas.acoes.some((l) => l.id === corpo.dados.id)).toBe(true)
  })

  it("400 ENTRADA_INVALIDA com os campos problemáticos", async () => {
    const r = await rAcoes.POST(req("/acoes", "POST", { ...ok, data: "ontem", titulo: "" }))
    expect(r.status).toBe(400)
    const corpo = await json(r)
    expect(corpo.ok).toBe(false)
    expect(corpo.erro.codigo).toBe("ENTRADA_INVALIDA")
    const caminhos = corpo.erro.campos.map((c: { caminho: string }) => c.caminho)
    expect(caminhos).toEqual(expect.arrayContaining(["data", "titulo"]))
  })

  it("400 JSON_INVALIDO", async () => {
    const r = await rAcoes.POST(req("/acoes", "POST", undefined, "{nao e json"))
    expect(r.status).toBe(400)
    expect((await json(r)).erro.codigo).toBe("JSON_INVALIDO")
  })

  it("413 para corpo grande demais", async () => {
    const r = await rAcoes.POST(req("/acoes", "POST", undefined, JSON.stringify({ x: "a".repeat(200_000) })))
    expect(r.status).toBe(413)
    expect((await json(r)).erro.codigo).toBe("CORPO_GRANDE_DEMAIS")
  })

  it("404, 422 e 409 do domínio", async () => {
    const naoAchou = await rAcoes.POST(req("/acoes", "POST", { ...ok, clientId: "fantasma" }))
    expect(naoAchou.status).toBe(404)
    expect((await json(naoAchou)).erro.codigo).toBe("NAO_ENCONTRADO")

    const semContrato = await rAcoes.POST(req("/acoes", "POST", { ...ok, frenteId: "cro" }))
    expect(semContrato.status).toBe(422)
    expect((await json(semContrato)).erro.codigo).toBe("REGRA_INVALIDA")

    expect((await rAcoes.POST(req("/acoes", "POST", { ...ok, id: "dup-1" }))).status).toBe(201)
    const dup = await rAcoes.POST(req("/acoes", "POST", { ...ok, id: "dup-1" }))
    expect(dup.status).toBe(409)
    expect((await json(dup)).erro.codigo).toBe("CONFLITO")
  })
})

describe("PATCH /api/radar/acoes/[id]", () => {
  beforeEach(async () => {
    await rResetar.POST()
  })

  it("muda o status", async () => {
    const id = "seed-bella-pele-materiais-aguardando-0"
    const r = await rAcaoId.PATCH(req(`/acoes/${id}`, "PATCH", { status: "concluida" }), ctx(id))
    expect(r.status).toBe(200)
    expect((await json(r)).dados).toMatchObject({ id, status: "concluida" })
  })

  it("400 para id ou status inválidos; 404 para inexistente", async () => {
    expect(
      (await rAcaoId.PATCH(req("/acoes/x", "PATCH", { status: "concluida" }), ctx("a b"))).status
    ).toBe(400)
    expect(
      (await rAcaoId.PATCH(req("/acoes/x", "PATCH", { status: "feita" }), ctx("valido-1"))).status
    ).toBe(400)
    expect(
      (await rAcaoId.PATCH(req("/acoes/x", "PATCH", { status: "concluida" }), ctx("nao-existe"))).status
    ).toBe(404)
  })
})

describe("POST /api/radar/checkups", () => {
  beforeEach(async () => {
    await rResetar.POST()
  })

  it("201 com data mais antiga corrigindo o histórico", async () => {
    const r = await rCheckups.POST(
      req("/checkups", "POST", {
        clientId: "techmania",
        data: "2026-11-13",
        entradas: [{ frenteId: "google-ads", data: "2026-08-05" }],
      })
    )
    expect(r.status).toBe(201)
    const corpo = await json(r)
    expect(corpo.dados.alteradas).toEqual(["google-ads"])
    const doGoogle = banco.tabelas.acoes.filter(
      (l) => l.cliente_id === "techmania" && l.frente_id === "google-ads" && l.status === "concluida"
    )
    expect(doGoogle).toHaveLength(1)
    expect(doGoogle[0].data).toBe("2026-08-05")
  })

  it("400 com entrada inválida", async () => {
    const r = await rCheckups.POST(
      req("/checkups", "POST", { clientId: "techmania", data: "x", entradas: [] })
    )
    expect(r.status).toBe(400)
  })
})

describe("PUT frentes, POST atribuições, PUT configuração", () => {
  beforeEach(async () => {
    await rResetar.POST()
  })

  it("PUT /frentes/[id]", async () => {
    const r = await rFrente.PUT(
      req("/frentes/crm", "PUT", { prazoDias: 90, criticoAposDias: 180 }),
      ctx("crm")
    )
    expect(r.status).toBe(200)
    expect((await json(r)).dados).toMatchObject({ id: "crm", prazoDias: 90, criticoAposDias: 180 })
    expect((await rFrente.PUT(req("/frentes/crm", "PUT", {}), ctx("crm"))).status).toBe(400)
    expect(
      (await rFrente.PUT(req("/frentes/crm", "PUT", { prazoDias: 500 }), ctx("crm"))).status
    ).toBe(422) // crítico atual (120) <= prazo novo
    expect((await rFrente.PUT(req("/frentes/zzz", "PUT", { prazoDias: 5 }), ctx("zzz"))).status).toBe(404)
  })

  it("POST /atribuicoes", async () => {
    const corpo = {
      oportunidadeId: "parada:aurora-moda:crm",
      setor: "CRM & Automação",
      data: "2026-11-13",
      texto: "Retomar régua",
    }
    expect((await rAtribuicoes.POST(req("/atribuicoes", "POST", corpo))).status).toBe(201)
    expect((await rAtribuicoes.POST(req("/atribuicoes", "POST", { ...corpo, setor: "Nada" }))).status).toBe(400)
    expect(banco.tabelas.atribuicoes).toHaveLength(1)
  })

  it("PUT /configuracao", async () => {
    const r = await rConfig.PUT(req("/configuracao", "PUT", { limiteAprovacaoDias: 8 }))
    expect(r.status).toBe(200)
    expect((await json(r)).dados.limiteAprovacaoDias).toBe(8)
    expect((await rConfig.PUT(req("/configuracao", "PUT", {}))).status).toBe(400)
  })
})

describe("POST /importar e /resetar", () => {
  it("importar valida o dataset (400) e importa o válido (200)", async () => {
    const ruim = await rImportar.POST(req("/importar", "POST", { clients: "x" }))
    expect(ruim.status).toBe(400)
    const base = buildSeed()
    const r = await rImportar.POST(req("/importar", "POST", { ...base, acoes: base.acoes.slice(0, 5) }))
    expect(r.status).toBe(200)
    expect((await json(r)).dados.acoes).toHaveLength(5)
  })

  it("importar com referência quebrada => 422 e o banco não muda", async () => {
    await rResetar.POST()
    const base = buildSeed()
    const r = await rImportar.POST(
      req("/importar", "POST", { ...base, acoes: [{ ...base.acoes[0], clientId: "fantasma" }] })
    )
    expect(r.status).toBe(422)
    expect(banco.tabelas.clientes).toHaveLength(10)
  })

  it("resetar volta ao gabarito", async () => {
    await rResetar.POST()
    await rAcoes.POST(
      req("/acoes", "POST", {
        clientId: "techmania",
        frenteId: "crm",
        titulo: "Extra",
        data: "2026-11-13",
        status: "concluida",
      })
    )
    const r = await rResetar.POST()
    expect(r.status).toBe(200)
    expect((await json(r)).dados.acoes).toHaveLength(buildSeed().acoes.length)
  })
})

describe("erros", () => {
  it("sem variáveis do banco: 503 BANCO_NAO_CONFIGURADO", async () => {
    estado.fornecer = () => {
      throw new BancoNaoConfiguradoError()
    }
    const r = await rRaiz.GET()
    expect(r.status).toBe(503)
    expect(await json(r)).toEqual({
      ok: false,
      erro: { codigo: "BANCO_NAO_CONFIGURADO", mensagem: "Banco de dados não configurado." },
    })
    expect((await rResetar.POST()).status).toBe(503)
  })

  it("falha do banco: 500 genérico, sem vazar o detalhe (que só vai para o log)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    estado.fornecer = () => ({
      selecionar: async () => {
        throw new ErroBanco("connection to db.segredo.supabase.co refused (password=hunter2)")
      },
    })
    const r = await rRaiz.GET()
    expect(r.status).toBe(500)
    const texto = JSON.stringify(await json(r))
    expect(texto).toContain("ERRO_INTERNO")
    expect(texto).not.toMatch(/segredo|hunter2|supabase|connection/)
    expect(log).toHaveBeenCalledOnce()
  })
})
