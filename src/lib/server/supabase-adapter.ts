import type { SupabaseClient } from "@supabase/supabase-js"

import type { Banco, Linha, OpcoesSelecao, Tabela } from "./banco"
import { ErroBanco } from "./errors"

const PAGINA = 1000
const LOTE_INSERCAO = 500
const LOTE_REMOCAO = 100

function checar(erro: { message?: string } | null, contexto: string): void {
  if (erro) throw new ErroBanco(`${contexto}: ${erro.message ?? "erro desconhecido"}`)
}

function lotes<T>(itens: readonly T[], tamanho: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) {
    out.push(itens.slice(i, i + tamanho))
  }
  return out
}

/** Implementa `Banco` sobre o supabase-js (PostgREST). */
export function bancoSupabase(c: SupabaseClient): Banco {
  return {
    async selecionar(tabela: Tabela, opcoes: OpcoesSelecao = {}) {
      const linhas: Linha[] = []
      for (let inicio = 0; ; inicio += PAGINA) {
        let q = c.from(tabela).select("*")
        for (const [coluna, valor] of Object.entries(opcoes.onde ?? {})) {
          q = q.eq(coluna, valor)
        }
        for (const coluna of opcoes.ordenarPor ?? []) {
          q = q.order(coluna, { ascending: true })
        }
        const { data, error } = await q.range(inicio, inicio + PAGINA - 1)
        checar(error, `selecionar ${tabela}`)
        const pagina = (data ?? []) as Linha[]
        linhas.push(...pagina)
        if (pagina.length < PAGINA) break
      }
      return linhas
    },

    async inserir(tabela, linhas) {
      for (const lote of lotes(linhas, LOTE_INSERCAO)) {
        const { error } = await c.from(tabela).insert(lote)
        checar(error, `inserir ${tabela}`)
      }
    },

    async upsert(tabela, linhas, colunaConflito) {
      for (const lote of lotes(linhas, LOTE_INSERCAO)) {
        const { error } = await c
          .from(tabela)
          .upsert(lote, { onConflict: colunaConflito })
        checar(error, `upsert ${tabela}`)
      }
    },

    async atualizar(tabela, valores, coluna, valor) {
      const { error } = await c.from(tabela).update(valores).eq(coluna, valor)
      checar(error, `atualizar ${tabela}`)
    },

    async remover(tabela, coluna, valores) {
      for (const lote of lotes(valores, LOTE_REMOCAO)) {
        const { error } = await c.from(tabela).delete().in(coluna, lote)
        checar(error, `remover ${tabela}`)
      }
    },

    async removerTudo(tabela, colunaChave) {
      const { error } = await c.from(tabela).delete().not(colunaChave, "is", null)
      checar(error, `limpar ${tabela}`)
    },
  }
}
