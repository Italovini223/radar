import { describe, expect, it } from "vitest"

import { nomeCurtoFrente } from "@/lib/domain/frentes"
import { formatarDias } from "@/lib/domain/opportunities"
import {
  ROTULO_SITUACAO,
  bloqueioCurto,
  dataCurta,
  rotuloDataReferencia,
  rotuloRelogio,
  textoBlocoBloqueio,
  tituloSugerido,
} from "@/lib/domain/rotulos"

describe("data de referência", () => {
  it("formata como '13 nov. 2026'", () => {
    expect(dataCurta("2026-11-13")).toBe("13 nov. 2026")
    expect(dataCurta("2026-01-05")).toBe("5 jan. 2026")
  })
  it("rótulo do Radar: demonstração vs. hoje real", () => {
    const hoje = new Date(2026, 10, 23, 9)
    expect(
      rotuloDataReferencia({ dataReferencia: "2026-11-13", usarHojeReal: false }, hoje)
    ).toBe("Data de referência: 13 nov. 2026 (demonstração)")
    expect(
      rotuloDataReferencia({ dataReferencia: "2026-11-13", usarHojeReal: true }, hoje)
    ).toBe("Hoje: 23 nov. 2026")
  })
})

describe("rótulos de relógio e bloqueio", () => {
  it("'Parado há' x 'Sem retorno do cliente há'", () => {
    expect(rotuloRelogio({ diasParaBloqueio: null })).toBe("Parado há")
    expect(rotuloRelogio({ diasParaBloqueio: 24 })).toBe("Sem retorno do cliente há")
    expect(rotuloRelogio({ diasParaBloqueio: -3 })).toBe("Sem retorno do cliente há")
  })
  it("bloqueioCurto", () => {
    expect(bloqueioCurto(24)).toBe("bloqueio em 24 dias")
    expect(bloqueioCurto(1)).toBe("bloqueio em 1 dia")
    expect(bloqueioCurto(0)).toBe("bloqueio hoje")
    expect(bloqueioCurto(-5)).toBe("bloqueado há 5 dias")
  })
  it("bloco da ficha: faltam N dias ou bloqueado", () => {
    expect(textoBlocoBloqueio(66, 24, 90)).toBe(
      "Sem retorno do cliente há 66 dias · faltam 24 dias para o bloqueio contratual (90 dias)"
    )
    expect(textoBlocoBloqueio(89, 1, 90)).toContain("falta 1 dia para o bloqueio contratual")
    expect(textoBlocoBloqueio(95, -5, 90)).toBe(
      "Sem retorno do cliente há 95 dias · bloqueado: o limite contratual de 90 dias foi atingido"
    )
    expect(textoBlocoBloqueio(90, 0, 90)).toContain("bloqueado")
  })
  it("situação do cliente", () => {
    expect(ROTULO_SITUACAO).toEqual({ critico: "Crítico", atencao: "Atenção", ok: "Ok" })
  })
})

describe("título sugerido ao registrar ação", () => {
  it("Google Ads: 'Otimização de Google Ads feita hoje'", () => {
    expect(tituloSugerido({ id: "google-ads", nome: "Google Ads" })).toBe(
      "Otimização de Google Ads feita hoje"
    )
    expect(tituloSugerido({ id: "meta-ads", nome: "Meta Ads" })).toBe(
      "Otimização de Meta Ads feita hoje"
    )
  })
  it("cada frente do gabarito gera um título não vazio e distinto", () => {
    const frentes = [
      ["google-ads", "Google Ads"],
      ["meta-ads", "Meta Ads"],
      ["crm", "CRM / Automações"],
      ["conteudo", "Social / Conteúdo"],
      ["materiais", "Produção de materiais"],
      ["redacao", "Redação"],
      ["desenvolvimento", "Desenvolvimento · loja em criação"],
      ["cro", "CRO / Melhorias do site"],
    ] as const
    const titulos = frentes.map(([id, nome]) => tituloSugerido({ id, nome }))
    expect(new Set(titulos).size).toBe(frentes.length)
    expect(titulos.every((t) => t.length > 10)).toBe(true)
  })
  it("frente desconhecida cai num título genérico com o nome", () => {
    expect(tituloSugerido({ id: "x", nome: "Nova frente" })).toBe("Ação em Nova frente feita hoje")
  })
})

describe("nome curto de frente", () => {
  it("Desenvolvimento ganha rótulo curto (o dado não muda); as demais mantêm o nome", () => {
    const nome = "Desenvolvimento · loja em criação (cliente sem retorno)"
    expect(nomeCurtoFrente({ id: "desenvolvimento", nome })).toBe("Desenvolvimento")
    expect(nomeCurtoFrente({ id: "google-ads", nome: "Google Ads" })).toBe("Google Ads")
  })
})

describe("formatarDias (acima de um ano)", () => {
  it("mostra anos e meses; sem meses, só anos", () => {
    expect(formatarDias(365)).toBe("1 ano")
    expect(formatarDias(730)).toBe("2 anos")
    expect(formatarDias(389)).toBe("1 ano")
    expect(formatarDias(365 + 60)).toBe("1 ano e 2 meses")
    expect(formatarDias(365 + 30)).toBe("1 ano e 1 mês")
    expect(formatarDias(47)).toBe("47 dias")
  })
})
