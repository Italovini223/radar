import { describe, expect, it } from "vitest"

import { montarGabarito as buildSeed } from "@/lib/data/gabarito-fixture"

import {
  atribuicaoSchema,
  checkupSchema,
  configuracaoParcialSchema,
  datasetSchema,
  frenteSchema,
  idRotaSchema,
  novaAcaoSchema,
  statusAcaoSchema,
} from "./schemas"

const acaoOk = {
  clientId: "aurora-moda",
  frenteId: "google-ads",
  titulo: "Otimização feita",
  data: "2026-11-13",
  status: "concluida",
}

describe("novaAcaoSchema", () => {
  it("aceita uma ação válida (id e responsável opcionais)", () => {
    expect(novaAcaoSchema.safeParse(acaoOk).success).toBe(true)
    expect(
      novaAcaoSchema.safeParse({ ...acaoOk, id: "acao-abc1", responsavel: "Squad Alfa" }).success
    ).toBe(true)
  })

  it.each([
    ["data com formato errado", { data: "13/11/2026" }],
    ["data com um dígito", { data: "2026-1-1" }],
    ["data inexistente", { data: "2026-02-31" }],
    ["data com horário", { data: "2026-11-13T10:00:00Z" }],
    ["título vazio", { titulo: "   " }],
    ["título gigante (201)", { titulo: "x".repeat(201) }],
    ["status fora do enum", { status: "feita" }],
    ["id com espaço", { id: "acao 1" }],
    ["id gigante", { id: "a".repeat(81) }],
    ["clientId vazio", { clientId: "" }],
    ["responsável gigante", { responsavel: "r".repeat(81) }],
    ["chave desconhecida", { admin: true }],
  ])("rejeita: %s", (_nome, extra) => {
    expect(novaAcaoSchema.safeParse({ ...acaoOk, ...extra }).success).toBe(false)
  })

  it("rejeita título tipo objeto e corpo não-objeto", () => {
    expect(novaAcaoSchema.safeParse({ ...acaoOk, titulo: { $ne: 1 } }).success).toBe(false)
    expect(novaAcaoSchema.safeParse("texto").success).toBe(false)
    expect(novaAcaoSchema.safeParse(null).success).toBe(false)
  })

  it("aceita o título no limite (200) e aplica trim", () => {
    const r = novaAcaoSchema.parse({ ...acaoOk, titulo: `  ${"x".repeat(200)}  ` })
    expect(r.titulo).toHaveLength(200)
  })
})

describe("statusAcaoSchema / idRotaSchema", () => {
  it("status", () => {
    expect(statusAcaoSchema.safeParse({ status: "em_andamento" }).success).toBe(true)
    expect(statusAcaoSchema.safeParse({ status: "x" }).success).toBe(false)
    expect(statusAcaoSchema.safeParse({}).success).toBe(false)
  })
  it("id da rota recusa caracteres perigosos", () => {
    expect(idRotaSchema.safeParse("seed-aurora-moda-crm-0").success).toBe(true)
    for (const ruim of ["", "a b", "a/b", "a;drop", "a".repeat(81), "../x", "%27"]) {
      expect(idRotaSchema.safeParse(ruim).success).toBe(false)
    }
  })
})

describe("checkupSchema", () => {
  const ok = {
    clientId: "aurora-moda",
    data: "2026-11-13",
    entradas: [
      { frenteId: "google-ads", data: "2026-11-01" },
      { frenteId: "crm", data: "" },
    ],
    resultadoAds: "estavel",
  }
  it("aceita data vazia (não alterar) e resultado opcional", () => {
    expect(checkupSchema.safeParse(ok).success).toBe(true)
    expect(checkupSchema.safeParse({ ...ok, resultadoAds: undefined }).success).toBe(true)
  })
  it.each([
    ["resultado inválido", { resultadoAds: "otimo" }],
    ["data do check-up inválida", { data: "2026-13-01" }],
    ["entrada com data inválida", { entradas: [{ frenteId: "crm", data: "ontem" }] }],
    ["entradas demais", { entradas: Array.from({ length: 51 }, () => ({ frenteId: "crm", data: "" })) }],
    ["sem entradas", { entradas: undefined }],
  ])("rejeita: %s", (_n, extra) => {
    expect(checkupSchema.safeParse({ ...ok, ...extra }).success).toBe(false)
  })
})

describe("frenteSchema", () => {
  it("aceita prazo, crítico ou ambos (crítico > prazo)", () => {
    expect(frenteSchema.safeParse({ prazoDias: 30 }).success).toBe(true)
    expect(frenteSchema.safeParse({ criticoAposDias: 60 }).success).toBe(true)
    expect(frenteSchema.safeParse({ prazoDias: 30, criticoAposDias: 60 }).success).toBe(true)
  })
  it.each([
    ["vazio", {}],
    ["crítico <= prazo", { prazoDias: 30, criticoAposDias: 30 }],
    ["prazo zero", { prazoDias: 0 }],
    ["prazo negativo", { prazoDias: -5 }],
    ["prazo fracionário", { prazoDias: 1.5 }],
    ["prazo como texto", { prazoDias: "30" }],
    ["prazo enorme", { prazoDias: 99999 }],
    ["chave desconhecida", { prazoDias: 30, nome: "x" }],
  ])("rejeita: %s", (_n, v) => {
    expect(frenteSchema.safeParse(v).success).toBe(false)
  })
})

describe("atribuicaoSchema", () => {
  const ok = {
    oportunidadeId: "parada:aurora-moda:crm",
    setor: "CRM & Automação",
    data: "2026-11-13",
    texto: "Olá",
  }
  it("aceita (parada e aprovacao; texto vazio)", () => {
    expect(atribuicaoSchema.safeParse(ok).success).toBe(true)
    expect(
      atribuicaoSchema.safeParse({ ...ok, oportunidadeId: "aprovacao:bella-pele:materiais", texto: "" })
        .success
    ).toBe(true)
  })
  it.each([
    ["id sem tipo", { oportunidadeId: "aurora-moda:crm" }],
    ["tipo desconhecido", { oportunidadeId: "outro:a:b" }],
    ["setor inexistente", { setor: "Financeiro" }],
    ["texto gigante", { texto: "t".repeat(2001) }],
    ["data inválida", { data: "hoje" }],
  ])("rejeita: %s", (_n, extra) => {
    expect(atribuicaoSchema.safeParse({ ...ok, ...extra }).success).toBe(false)
  })
})

describe("configuracaoParcialSchema", () => {
  it("aceita parcial", () => {
    expect(configuracaoParcialSchema.safeParse({ limiteAprovacaoDias: 7 }).success).toBe(true)
    expect(configuracaoParcialSchema.safeParse({ dataReferencia: "2026-11-13", usarHojeReal: true }).success).toBe(true)
  })
  it.each([
    ["vazio", {}],
    ["limite zero", { limiteAprovacaoDias: 0 }],
    ["bloqueio negativo", { bloqueioContratualDias: -1 }],
    ["data inválida", { dataReferencia: "2026-00-10" }],
    ["usarHojeReal como texto", { usarHojeReal: "sim" }],
    ["chave desconhecida", { limite: 3 }],
  ])("rejeita: %s", (_n, v) => {
    expect(configuracaoParcialSchema.safeParse(v).success).toBe(false)
  })
})

describe("datasetSchema (importar)", () => {
  it("aceita a própria fixture do gabarito", () => {
    const r = datasetSchema.safeParse(buildSeed())
    expect(r.success).toBe(true)
  })
  it("rejeita frente com crítico <= prazo, ação com status inválido e campo extra", () => {
    const base = buildSeed()
    expect(
      datasetSchema.safeParse({
        ...base,
        frentes: [{ ...base.frentes[0], criticoAposDias: base.frentes[0].prazoDias }],
      }).success
    ).toBe(false)
    expect(
      datasetSchema.safeParse({
        ...base,
        acoes: [{ ...base.acoes[0], status: "x" }],
      }).success
    ).toBe(false)
    expect(datasetSchema.safeParse({ ...base, extra: 1 }).success).toBe(false)
  })
  it("limita o tamanho das listas", () => {
    const base = buildSeed()
    const muitos = Array.from({ length: 501 }, (_, i) => ({ ...base.clients[0], id: `c${i}` }))
    expect(datasetSchema.safeParse({ ...base, clients: muitos }).success).toBe(false)
  })
})
