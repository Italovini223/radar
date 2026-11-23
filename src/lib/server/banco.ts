/**
 * Interface MÍNIMA do banco usada por `radar-db.ts`. Quem a implementa:
 * `bancoSupabase` (supabase-adapter.ts) em produção e um fake em memória nos
 * testes (src/test/banco-fake.ts). Assim a lógica roda sem rede e sem segredo.
 */
export type Tabela =
  | "clientes"
  | "frentes"
  | "cliente_frentes"
  | "acoes"
  | "checkups"
  | "atribuicoes"
  | "configuracoes"

export type Linha = Record<string, unknown>

export interface OpcoesSelecao {
  /** Filtros de igualdade (coluna = valor). */
  onde?: Record<string, string | number>
  /** Colunas de ordenação crescente. */
  ordenarPor?: string[]
}

export interface Banco {
  selecionar(tabela: Tabela, opcoes?: OpcoesSelecao): Promise<Linha[]>
  inserir(tabela: Tabela, linhas: Linha[]): Promise<void>
  /** Insere ou atualiza pela coluna de conflito (chave primária). */
  upsert(tabela: Tabela, linhas: Linha[], colunaConflito: string): Promise<void>
  atualizar(
    tabela: Tabela,
    valores: Linha,
    coluna: string,
    valor: string | number
  ): Promise<void>
  /** Remove as linhas cuja `coluna` está em `valores`. */
  remover(tabela: Tabela, coluna: string, valores: string[]): Promise<void>
  /** Remove todas as linhas (`colunaChave` = qualquer coluna NOT NULL). */
  removerTudo(tabela: Tabela, colunaChave: string): Promise<void>
}
