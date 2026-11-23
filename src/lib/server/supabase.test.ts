import { afterEach, describe, expect, it, vi } from "vitest"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ErroBanco } from "./errors"
import { bancoSupabase } from "./supabase-adapter"
import { getSupabase } from "./supabase"
import { BancoNaoConfiguradoError } from "./errors"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getSupabase (criado sob demanda)", () => {
  it("sem SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: erro tipado BANCO_NAO_CONFIGURADO", () => {
    vi.stubEnv("SUPABASE_URL", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    expect(() => getSupabase()).toThrow(BancoNaoConfiguradoError)
    try {
      getSupabase()
    } catch (e) {
      expect(e).toMatchObject({ status: 503, codigo: "BANCO_NAO_CONFIGURADO" })
    }
  })

  it("falta só a chave: também erro", () => {
    vi.stubEnv("SUPABASE_URL", "https://exemplo.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    expect(() => getSupabase()).toThrow(BancoNaoConfiguradoError)
  })

  it("com as duas variáveis (valores de mentira, sem rede) devolve um cliente reaproveitado", () => {
    vi.stubEnv("SUPABASE_URL", "https://exemplo.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "chave-de-teste-nao-secreta")
    const a = getSupabase()
    expect(a).toBe(getSupabase())
  })
})

type Passo = [string, ...unknown[]]
interface Consulta {
  tabela: string
  passos: Passo[]
}

/** Cliente "supabase" de mentira: registra a cadeia e devolve o que o teste mandar. */
function clienteMock(resolver: (c: Consulta) => { data?: unknown; error?: { message: string } | null }) {
  const consultas: Consulta[] = []
  const cliente = {
    from(tabela: string) {
      const consulta: Consulta = { tabela, passos: [] }
      consultas.push(consulta)
      const b: Record<string, unknown> = {}
      for (const m of ["select", "eq", "order", "range", "insert", "upsert", "update", "delete", "in", "not"]) {
        b[m] = (...args: unknown[]) => {
          consulta.passos.push([m, ...args])
          return b
        }
      }
      b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resolver(consulta)).then(res, rej)
      return b
    },
  } as unknown as SupabaseClient
  return { cliente, consultas }
}

describe("bancoSupabase (adaptador)", () => {
  it("selecionar: filtros, ordem e paginação até a última página", async () => {
    const paginas = [Array.from({ length: 1000 }, (_, i) => ({ id: i })), [{ id: 1000 }, { id: 1001 }]]
    let n = 0
    const { cliente, consultas } = clienteMock(() => ({ data: paginas[n++] }))
    const linhas = await bancoSupabase(cliente).selecionar("acoes", {
      onde: { cliente_id: "c1" },
      ordenarPor: ["data", "id"],
    })
    expect(linhas).toHaveLength(1002)
    expect(consultas).toHaveLength(2)
    expect(consultas[0].passos).toEqual([
      ["select", "*"],
      ["eq", "cliente_id", "c1"],
      ["order", "data", { ascending: true }],
      ["order", "id", { ascending: true }],
      ["range", 0, 999],
    ])
    expect(consultas[1].passos.at(-1)).toEqual(["range", 1000, 1999])
  })

  it("inserir em lotes de 500; lista vazia não chama o banco", async () => {
    const { cliente, consultas } = clienteMock(() => ({ error: null }))
    const banco = bancoSupabase(cliente)
    await banco.inserir("acoes", Array.from({ length: 1100 }, (_, i) => ({ id: i })))
    expect(consultas.map((c) => (c.passos[0][1] as unknown[]).length)).toEqual([500, 500, 100])
    await banco.inserir("acoes", [])
    expect(consultas).toHaveLength(3)
  })

  it("upsert com onConflict, update com eq, delete com in (lotes de 100) e limpar tudo", async () => {
    const { cliente, consultas } = clienteMock(() => ({ error: null }))
    const banco = bancoSupabase(cliente)
    await banco.upsert("atribuicoes", [{ oportunidade_id: "x" }], "oportunidade_id")
    await banco.atualizar("frentes", { prazo_dias: 5 }, "id", "crm")
    await banco.remover("acoes", "id", Array.from({ length: 150 }, (_, i) => `a${i}`))
    await banco.removerTudo("clientes", "id")
    expect(consultas[0].passos).toEqual([["upsert", [{ oportunidade_id: "x" }], { onConflict: "oportunidade_id" }]])
    expect(consultas[1].passos).toEqual([["update", { prazo_dias: 5 }], ["eq", "id", "crm"]])
    expect(consultas[2].passos[0]).toEqual(["delete"])
    expect(consultas[2].passos[1][0]).toBe("in")
    expect((consultas[2].passos[1][2] as string[]).length).toBe(100)
    expect((consultas[3].passos[1][2] as string[]).length).toBe(50)
    expect(consultas[4].passos).toEqual([["delete"], ["not", "id", "is", null]])
  })

  it("erro do PostgREST vira ErroBanco (não vaza para o cliente: tratarErro devolve 500)", async () => {
    const { cliente } = clienteMock(() => ({ error: { message: "permission denied" } }))
    await expect(bancoSupabase(cliente).selecionar("acoes")).rejects.toBeInstanceOf(ErroBanco)
    await expect(bancoSupabase(cliente).inserir("acoes", [{ id: 1 }])).rejects.toBeInstanceOf(ErroBanco)
  })
})
