import { describe, expect, it, vi } from "vitest"

import {
  GABARITO_PLANILHA,
  TOTAL_TAREFAS_PLANILHA,
  montarPlanilha,
} from "@/lib/data/planilha-dataset"
import { buildSeed } from "@/lib/data/seed"
import {
  alertasDoCliente,
  proximaOportunidade,
} from "@/lib/domain/opportunities"
import {
  agoraDaConfiguracao,
  contextoDoSnapshot,
  situacaoDoCliente,
} from "@/lib/domain/rules"
import type { Banco } from "@/lib/server/banco"
import { BancoMemoria } from "@/lib/server/banco-memoria"
import { carregarSnapshot, importarDataset, resetar } from "@/lib/server/radar-db"

/**
 * Servidor + dataset REAL da planilha (sem mock do seed): o que o botão
 * "Resetar/Carregar demonstração" e o modo memória realmente gravam.
 */
const estado = vi.hoisted(() => ({ banco: null as unknown }))
vi.mock("@/lib/server/banco-instancia", () => ({
  getBanco: () => estado.banco as Banco,
}))

import * as rRaiz from "@/app/api/radar/route"
import * as rAcoes from "@/app/api/radar/acoes/route"
import * as rResetar from "@/app/api/radar/resetar/route"

describe("dataset padrão (planilha): resetar / importar", () => {
  it("buildSeed() é a planilha real: 10 clientes, 8 frentes, 172 ações", () => {
    const s = buildSeed()
    expect(s.clients).toHaveLength(10)
    expect(s.frentes).toHaveLength(8)
    expect(s.acoes).toHaveLength(TOTAL_TAREFAS_PLANILHA)
    expect(TOTAL_TAREFAS_PLANILHA).toBe(172)
  })

  it("resetar (dataset padrão) grava 10 clientes, 8 frentes e 172 ações com a configuração de referência", async () => {
    const banco = new BancoMemoria()
    const snap = await resetar(banco)
    expect(snap.clients).toHaveLength(10)
    expect(snap.frentes).toHaveLength(8)
    expect(snap.acoes).toHaveLength(172)
    expect(snap.contratos).toHaveLength(montarPlanilha().contratos!.length)
    expect(snap.configuracao.dataReferencia).toBe("2026-11-13")
    expect(banco.tabelas.acoes).toHaveLength(172)
    // Origem das ações é preservada (ou 'planilha' por padrão).
    expect(banco.tabelas.acoes.every((l) => ["seed", "planilha"].includes(String(l.origem)))).toBe(true)
  })

  it("importar o dataset padrão dá o mesmo resultado que resetar", async () => {
    const a = new BancoMemoria()
    const b = new BancoMemoria()
    expect(await importarDataset(a, buildSeed())).toEqual(await resetar(b))
  })

  it("o motor, lendo do banco, reproduz o gabarito da planilha", async () => {
    const banco = new BancoMemoria()
    await resetar(banco)
    const snap = await carregarSnapshot(banco)
    const hoje = agoraDaConfiguracao(snap.configuracao, new Date(2030, 0, 1))
    const ctx = contextoDoSnapshot(snap)
    for (const [id, g] of Object.entries(GABARITO_PLANILHA)) {
      expect(
        situacaoDoCliente(id, snap.clients, snap.frentes, snap.acoes, hoje, ctx),
        id
      ).toBe(g.situacao)
    }
    const alertas = (id: string) =>
      alertasDoCliente(id, snap.clients, snap.frentes, snap.acoes, hoje, ctx)
    const total = snap.clients.flatMap((c) => alertas(c.id))
    expect(total).toHaveLength(10) // Aurora 4, Ninho 2, Patas 1, Vitta 1, Bella 1, Raiz 1
    expect(alertas("aurora-moda")).toHaveLength(4)
    expect(alertas("ninho-casa-decor")).toHaveLength(2)
    for (const id of ["techmania", "doce-lar", "mundo-kids", "lumi-acessorios"]) {
      expect(alertas(id), id).toEqual([])
    }
    const raiz = alertas("raiz-organicos")[0]
    expect(raiz).toMatchObject({ diasParado: 66, diasParaBloqueio: 24, estado: "critica" })
    expect(
      proximaOportunidade("aurora-moda", snap.clients, snap.frentes, snap.acoes, hoje, ctx)?.estado
    ).toBe("critica")
  })

  it("responsável de cliente vazio na planilha volta vazio do banco (nada inventado)", async () => {
    const banco = new BancoMemoria()
    const snap = await resetar(banco)
    expect(snap.clients.every((c) => c.responsavel === "")).toBe(true)
  })
})

describe("POST /api/radar/resetar com o dataset real", () => {
  it("volta a 172 ações depois de mudanças", async () => {
    estado.banco = new BancoMemoria()
    const r1 = await rResetar.POST()
    expect(r1.status).toBe(200)
    const cria = await rAcoes.POST(
      new Request("http://localhost/api/radar/acoes", {
        method: "POST",
        body: JSON.stringify({
          clientId: "aurora-moda",
          frenteId: "google-ads",
          titulo: "Extra",
          data: "2026-11-13",
          status: "concluida",
        }),
      })
    )
    expect(cria.status).toBe(201)
    const meio = (await (await rRaiz.GET()).json()) as { dados: { acoes: unknown[] } }
    expect(meio.dados.acoes).toHaveLength(173)
    const r2 = await rResetar.POST()
    expect(((await r2.json()) as { dados: { acoes: unknown[] } }).dados.acoes).toHaveLength(172)
  })
})
