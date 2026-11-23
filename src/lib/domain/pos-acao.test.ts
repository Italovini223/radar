import { describe, expect, it } from "vitest"

import { montarGabarito as buildSeed } from "@/lib/data/gabarito-fixture"

import { derivarOportunidades } from "./opportunities"
import { resumoPosAcao, textosPosAcao } from "./pos-acao"
import { contextoDoSnapshot } from "./rules"
import type { Acao, StatusAcao } from "./types"

const seed = buildSeed()
const ctx = contextoDoSnapshot(seed)
const HOJE = new Date(2026, 10, 13, 12)
const opps = (acoes: Acao[]) =>
  derivarOportunidades(seed.clients, seed.frentes, acoes, HOJE, ctx)
const nomeFrente = (id: string) => seed.frentes.find((f) => f.id === id)?.nome ?? id
const nomeCliente = (id: string) => seed.clients.find((c) => c.id === id)!.nome

const nova = (
  clientId: string,
  frenteId: string,
  status: StatusAcao,
  data = "2026-11-13"
): Acao => ({
  id: `x-${clientId}-${frenteId}-${status}`,
  clientId,
  frenteId,
  titulo: "Ação nova",
  data,
  status,
  aguardandoDesde: status === "aguardando_aprovacao" ? data : undefined,
})

function simular(clientId: string, registradas: Acao[]) {
  const antes = opps(seed.acoes)
  const depois = opps([...seed.acoes, ...registradas])
  const status = registradas[0].status
  const resumo = resumoPosAcao({
    clientId,
    frenteIds: registradas.map((a) => a.frenteId),
    status,
    antes,
    depois,
  })
  return {
    resumo,
    textos: textosPosAcao(resumo, { cliente: nomeCliente(clientId), frente: nomeFrente }),
  }
}

describe("resumoPosAcao / textosPosAcao", () => {
  it("Aurora Moda, Google Ads concluída hoje: alerta resolvido e próxima oportunidade = CRM", () => {
    const { resumo, textos } = simular("aurora-moda", [nova("aurora-moda", "google-ads", "concluida")])
    expect(resumo.resolvidas.map((o) => o.id)).toEqual(["parada:aurora-moda:google-ads"])
    expect(resumo.semEfeito).toEqual([])
    expect(resumo.proxima?.id).toBe("parada:aurora-moda:crm")
    expect(resumo.pendentes).toBe(2)
    expect(textos).toMatchObject({
      tom: "resolvido",
      titulo: "Alerta resolvido: Google Ads de Aurora Moda",
      proxima: { titulo: "Próxima oportunidade sugerida", frente: "CRM / Automações" },
      vazio: null,
    })
    expect(textos.proxima?.motivo).toContain("85 dias")
  })

  it("não sobrou nada: 'Nenhum alerta pendente para {cliente}'", () => {
    const { resumo, textos } = simular("vitta-suplementos", [nova("vitta-suplementos", "conteudo", "concluida")])
    expect(resumo.proxima).toBeNull()
    expect(textos.titulo).toBe("Alerta resolvido: Social / Conteúdo de Vitta Suplementos")
    expect(textos.proxima).toBeNull()
    expect(textos.vazio).toBe("Nenhum alerta pendente para Vitta Suplementos")
  })

  it("ação aguardando aprovação NÃO resolve: diz isso com clareza e mantém a próxima", () => {
    const { resumo, textos } = simular("aurora-moda", [
      nova("aurora-moda", "google-ads", "aguardando_aprovacao"),
    ])
    expect(resumo.resolvidas).toEqual([])
    expect(resumo.semEfeito.map((o) => o.id)).toEqual(["parada:aurora-moda:google-ads"])
    expect(textos.tom).toBe("sem_efeito")
    expect(textos.titulo).toBe("Ação registrada, mas o alerta de Google Ads continua")
    expect(textos.detalhe).toMatch(/aguardando aprovação não zera o contador/)
    expect(resumo.proxima?.id).toBe("parada:aurora-moda:google-ads")
  })

  it("em andamento também não resolve", () => {
    const { textos } = simular("aurora-moda", [nova("aurora-moda", "google-ads", "em_andamento")])
    expect(textos.tom).toBe("sem_efeito")
    expect(textos.detalhe).toMatch(/em andamento não zera/)
  })

  it("concluída com data antiga demais não resolve e explica o motivo", () => {
    // 2026-09-01 é anterior à última ação (69 dias): o par continua crítico.
    const { textos } = simular("aurora-moda", [nova("aurora-moda", "google-ads", "concluida", "2026-09-01")])
    expect(textos.tom).toBe("sem_efeito")
    expect(textos.detalhe).toMatch(/além do prazo da frente/)
  })

  it("frente sem alerta: confirmação neutra, nenhum alerta mudou", () => {
    const { resumo, textos } = simular("techmania", [nova("techmania", "crm", "concluida")])
    expect(resumo.resolvidas).toEqual([])
    expect(textos).toMatchObject({
      tom: "neutro",
      titulo: "Ação registrada em CRM / Automações",
      detalhe: "Nenhum alerta mudou: essa frente já estava dentro do prazo.",
      vazio: "Nenhum alerta pendente para TechMania",
    })
  })

  it("vários alertas resolvidos de uma vez (check-up)", () => {
    const { resumo, textos } = simular("ninho-casa-decor", [
      nova("ninho-casa-decor", "crm", "concluida", "2026-11-12"),
      nova("ninho-casa-decor", "cro", "concluida", "2026-11-12"),
    ])
    expect(resumo.resolvidas).toHaveLength(2)
    expect(textos.titulo).toBe(
      "Alertas resolvidos de Ninho Casa & Decor: CRM / Automações, CRO / Melhorias do site"
    )
    expect(textos.vazio).toBe("Nenhum alerta pendente para Ninho Casa & Decor")
  })

  it("só olha o cliente da ação (alertas de outros clientes não entram)", () => {
    const { resumo } = simular("patas-pet-store", [nova("patas-pet-store", "google-ads", "concluida")])
    expect(resumo.resolvidas.every((o) => o.clientId === "patas-pet-store")).toBe(true)
    expect(resumo.pendentes).toBe(0)
  })

  it("Raiz (loja em criação): concluir um follow-up não resolve, o relógio é o retorno do cliente", () => {
    const { resumo, textos } = simular("raiz-organicos", [
      nova("raiz-organicos", "desenvolvimento", "concluida"),
    ])
    expect(resumo.resolvidas).toEqual([])
    expect(textos.tom).toBe("sem_efeito")
    expect(textos.detalhe).toMatch(/só reinicia quando o cliente dá retorno/)
    expect(textos.proxima?.motivo).toContain("faltam 24 dias para o bloqueio contratual")
  })
})
