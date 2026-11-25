import { afterEach, describe, expect, it, vi } from "vitest"

import { TOTAL_TAREFAS_PLANILHA, montarPlanilha } from "@/lib/data/planilha-dataset"
import { BancoNaoConfiguradoError } from "@/lib/server/errors"
import { getBanco } from "@/lib/server/banco-instancia"
import { modoDoBanco } from "@/lib/server/modo-banco"

const g = globalThis as { __radarBancoMemoria?: unknown; __radarAvisoModoBanco?: boolean }

afterEach(() => {
  vi.unstubAllEnvs()
  delete g.__radarBancoMemoria
  delete g.__radarAvisoModoBanco
  vi.restoreAllMocks()
})

describe("modoDoBanco", () => {
  it("memória só fora de produção", () => {
    expect(modoDoBanco({ RADAR_DB: "memoria", NODE_ENV: "development" })).toBe("memoria")
    expect(modoDoBanco({ RADAR_DB: "memoria", NODE_ENV: "test" })).toBe("memoria")
    expect(modoDoBanco({ RADAR_DB: "memoria-vazia", NODE_ENV: "development" })).toBe("memoria-vazia")
  })
  it("em produção RADAR_DB é ignorado", () => {
    expect(modoDoBanco({ RADAR_DB: "memoria", NODE_ENV: "production" })).toBe("supabase")
    expect(modoDoBanco({ RADAR_DB: "memoria-vazia", NODE_ENV: "production" })).toBe("supabase")
  })
  it("sem a variável (ou valor desconhecido) usa o Supabase", () => {
    expect(modoDoBanco({ NODE_ENV: "development" })).toBe("supabase")
    expect(modoDoBanco({ RADAR_DB: "sqlite", NODE_ENV: "development" })).toBe("supabase")
  })
})

describe("getBanco", () => {
  it("modo memória: banco semeado com o dataset REAL da planilha e compartilhado entre chamadas", async () => {
    vi.stubEnv("RADAR_DB", "memoria")
    vi.stubEnv("NODE_ENV", "development")
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const a = getBanco()
    expect(a).toBe(getBanco())
    expect(await a.selecionar("clientes")).toHaveLength(10)
    expect(await a.selecionar("frentes")).toHaveLength(6)
    expect(await a.selecionar("acoes")).toHaveLength(TOTAL_TAREFAS_PLANILHA)
    expect(await a.selecionar("cliente_frentes")).toHaveLength(montarPlanilha().contratos!.length)
  })

  it("memoria-vazia começa sem dados", async () => {
    vi.stubEnv("RADAR_DB", "memoria-vazia")
    vi.stubEnv("NODE_ENV", "development")
    vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(await getBanco().selecionar("clientes")).toHaveLength(0)
  })

  it("em produção NÃO habilita o fake: sem credenciais, erro claro de banco não configurado", () => {
    vi.stubEnv("RADAR_DB", "memoria")
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("SUPABASE_URL", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(() => getBanco()).toThrow(BancoNaoConfiguradoError)
    expect(g.__radarBancoMemoria).toBeUndefined()
  })
})
