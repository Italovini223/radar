import { describe, expect, it } from "vitest"

import {
  acoesPorPessoa,
  acoesPorStatus,
  atividadeSemanal,
  iniciais,
  pessoaDe,
  pessoasEmAtraso,
  pessoasPorFrente,
  saudeDoCliente,
  usoDoPrazo,
} from "@/lib/domain/pessoas"
import type { Acao, StatusFrente } from "@/lib/domain/types"

const acao = (
  id: string,
  frenteId: string,
  data: string,
  responsavel?: string,
  status: Acao["status"] = "concluida",
  clientId = "c1"
): Acao => ({ id, clientId, frenteId, titulo: id, data, status, responsavel })

const linha = (
  frenteId: string,
  estado: StatusFrente["estado"],
  dias: number | null = 10,
  nunca = false
): StatusFrente => ({
  clientId: "c1",
  frenteId,
  estado,
  nunca,
  semHistorico: false,
  dias,
  prazoDias: 30,
  travada: false,
  relogio: "ultima_acao",
  diasParaBloqueio: null,
})

describe("pessoaDe", () => {
  it("separa área e nome", () => {
    expect(pessoaDe("Tráfego · Marina")).toEqual({
      id: "marina",
      nome: "Marina",
      area: "Tráfego",
    })
    expect(pessoaDe("Gestão de Projetos · Diego")?.area).toBe("Gestão de Projetos")
  })
  it("aceita só o nome e normaliza o id", () => {
    expect(pessoaDe("Júlia")).toEqual({ id: "julia", nome: "Júlia" })
    expect(pessoaDe("Redação · Júlia")?.id).toBe(pessoaDe("Júlia")?.id)
  })
  it("vazio vira null", () => {
    expect(pessoaDe("")).toBeNull()
    expect(pessoaDe("   ")).toBeNull()
    expect(pessoaDe(undefined)).toBeNull()
  })
})

describe("iniciais", () => {
  it("uma ou duas palavras", () => {
    expect(iniciais("Marina")).toBe("MA")
    expect(iniciais("Ana Clara Souza")).toBe("AS")
  })
})

describe("pessoasPorFrente", () => {
  it("sem repetição, de quem atuou por último para o primeiro", () => {
    const acoes = [
      acao("a1", "meta", "2026-10-01", "Tráfego · Marina"),
      acao("a2", "meta", "2026-11-01", "Tráfego · Lucas"),
      acao("a3", "meta", "2026-11-05", "Tráfego · Marina"),
      acao("a4", "crm", "2026-11-02"),
      acao("a5", "meta", "2026-11-09", "Tráfego · Lucas", "concluida", "outro"),
    ]
    const mapa = pessoasPorFrente(acoes, "c1")
    expect(mapa.get("meta")?.map((p) => p.nome)).toEqual(["Marina", "Lucas"])
    expect(mapa.has("crm")).toBe(false)
  })
})

describe("pessoasEmAtraso", () => {
  const acoes = [
    acao("a1", "gads", "2026-09-20", "Tráfego · Lucas"),
    acao("a2", "gads", "2026-09-01", "Tráfego · Marina"),
    acao("a3", "meta", "2026-11-04", "Tráfego · Marina"),
    acao("a4", "red", "2026-11-08", "Redação · Júlia"),
  ]
  const linhas = [
    linha("gads", "critica", 65),
    linha("meta", "atrasada", 20),
    linha("red", "em_dia", 5),
  ]

  it("só quem atuou em frente atrasada ou crítica, mais grave primeiro", () => {
    const r = pessoasEmAtraso(linhas, acoes, "c1")
    expect(r.map((x) => x.pessoa.nome)).toEqual(["Marina", "Lucas"])
    expect(r[0].demandas.map((d) => d.frenteId)).toEqual(["gads", "meta"])
    expect(r[0].totalAcoes).toBe(2)
  })

  it("marca quem atuou por último na frente", () => {
    const r = pessoasEmAtraso(linhas, acoes, "c1")
    const lucas = r.find((x) => x.pessoa.nome === "Lucas")!
    const marina = r.find((x) => x.pessoa.nome === "Marina")!
    expect(lucas.demandas[0].ultimaAAtuar).toBe(true)
    expect(marina.demandas.find((d) => d.frenteId === "gads")?.ultimaAAtuar).toBe(false)
    expect(marina.demandas.find((d) => d.frenteId === "meta")?.ultimaAAtuar).toBe(true)
  })

  it("sem frente atrasada, lista vazia", () => {
    expect(pessoasEmAtraso([linha("red", "em_dia")], acoes, "c1")).toEqual([])
  })
})

describe("painel do cliente", () => {
  it("saúde = % de frentes sem atraso", () => {
    expect(
      saudeDoCliente([linha("a", "em_dia"), linha("b", "atencao"), linha("c", "critica"), linha("d", "atrasada")])
    ).toBe(50)
    expect(saudeDoCliente([])).toBe(100)
  })

  it("ações por status", () => {
    const r = acoesPorStatus(
      [
        acao("a", "x", "2026-11-01"),
        acao("b", "x", "2026-11-01", undefined, "em_andamento"),
        acao("c", "x", "2026-11-01", undefined, "aguardando_aprovacao"),
        acao("d", "x", "2026-11-01", undefined, "concluida", "outro"),
      ],
      "c1"
    )
    expect(r).toEqual({ concluida: 1, em_andamento: 1, aguardando_aprovacao: 1 })
  })

  it("atividade semanal: janelas de 7 dias terminando hoje", () => {
    const hoje = new Date(2026, 10, 13)
    const s = atividadeSemanal(
      [
        acao("a", "x", "2026-11-13"),
        acao("b", "x", "2026-11-07"),
        acao("c", "x", "2026-11-06"),
        acao("d", "x", "2026-08-01"),
      ],
      "c1",
      hoje,
      4
    )
    expect(s).toHaveLength(4)
    expect(s[3].inicio).toBe("2026-11-07")
    expect(s.map((w) => w.acoes)).toEqual([0, 0, 1, 2])
  })

  it("uso do prazo, limitado a 2× e com 'nunca' no máximo", () => {
    const r = usoDoPrazo([linha("a", "em_dia", 15), linha("b", "critica", 90), linha("c", "critica", null, true)])
    expect(r.map((x) => x.uso)).toEqual([0.5, 2, 2])
  })

  it("ações por pessoa, de quem fez mais para menos", () => {
    const r = acoesPorPessoa(
      [
        acao("a", "x", "2026-11-01", "Redação · Júlia"),
        acao("b", "x", "2026-11-02", "Júlia", "em_andamento"),
        acao("c", "x", "2026-11-03", "Tráfego · Marina"),
      ],
      "c1"
    )
    expect(r.map((x) => [x.pessoa.nome, x.concluidas, x.abertas])).toEqual([
      ["Júlia", 1, 1],
      ["Marina", 1, 0],
    ])
  })
})
