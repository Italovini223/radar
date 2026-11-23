import type { Banco, Linha, OpcoesSelecao, Tabela } from "@/lib/server/banco"
import { ErroBanco } from "@/lib/server/errors"

/**
 * Banco FAKE em memória para testes (sem rede, sem segredo). Emula o que o
 * schema real garante: chave primária, chaves estrangeiras, checks de enum e
 * a regra "aguardando_aprovacao exige aguardando_desde".
 */
const CHAVES: Record<Tabela, string[]> = {
  clientes: ["id"],
  frentes: ["id"],
  cliente_frentes: ["cliente_id", "frente_id"],
  acoes: ["id"],
  checkups: ["id"],
  atribuicoes: ["oportunidade_id"],
  configuracoes: ["id"],
}

const DEFAULTS: Partial<Record<Tabela, Linha>> = {
  clientes: { nicho: "", tipo: "operacao", responsavel: "", ativo: true },
  acoes: { responsavel: "", origem: "seed" },
  atribuicoes: { texto: "" },
}

export type Operacao = "selecionar" | "inserir" | "upsert" | "atualizar" | "remover" | "removerTudo"

export class BancoFake implements Banco {
  readonly tabelas: Record<Tabela, Linha[]> = {
    clientes: [],
    frentes: [],
    cliente_frentes: [],
    acoes: [],
    checkups: [],
    atribuicoes: [],
    configuracoes: [
      {
        id: 1,
        limite_aprovacao_dias: 5,
        bloqueio_contratual_dias: 90,
        data_referencia: "2026-11-13",
        usar_hoje_real: false,
      },
    ],
  }
  readonly chamadas: Array<{ operacao: Operacao; tabela: Tabela }> = []
  /** Falha injetada: a N-ésima chamada (1 = próxima) da operação/tabela lança. */
  private falhas: Array<{ operacao: Operacao; tabela: Tabela; restantes: number }> = []

  falharEm(operacao: Operacao, tabela: Tabela, naChamada = 1) {
    this.falhas.push({ operacao, tabela, restantes: naChamada })
  }

  private registrar(operacao: Operacao, tabela: Tabela) {
    this.chamadas.push({ operacao, tabela })
    for (const f of this.falhas) {
      if (f.operacao !== operacao || f.tabela !== tabela) continue
      f.restantes -= 1
      if (f.restantes === 0) throw new ErroBanco(`falha injetada em ${operacao} ${tabela}`)
    }
  }

  private chave(tabela: Tabela, l: Linha): string {
    return CHAVES[tabela].map((c) => String(l[c])).join("\u0000")
  }

  private validar(tabela: Tabela, l: Linha, indice: number) {
    for (const c of CHAVES[tabela]) {
      if (l[c] == null) throw new ErroBanco(`null em ${tabela}.${c}`)
    }
    const existe = (t: Tabela, col: string, v: unknown) =>
      this.tabelas[t].some((x) => x[col] === v)
    const fk = (t: Tabela, col: string, v: unknown) => {
      if (!existe(t, col, v)) throw new ErroBanco(`FK violada em ${tabela}: ${t}.${col}=${String(v)}`)
    }
    if (tabela === "acoes") {
      fk("clientes", "id", l.cliente_id)
      fk("frentes", "id", l.frente_id)
      if (!["concluida", "em_andamento", "aguardando_aprovacao"].includes(String(l.status))) {
        throw new ErroBanco("check status")
      }
      if (!["seed", "manual", "checkup", "planilha"].includes(String(l.origem))) {
        throw new ErroBanco("check origem")
      }
      if (l.status === "aguardando_aprovacao" && l.aguardando_desde == null) {
        throw new ErroBanco("check aguardando_desde")
      }
      if (l.data == null) throw new ErroBanco("data obrigatória")
    }
    if (tabela === "cliente_frentes") {
      fk("clientes", "id", l.cliente_id)
      fk("frentes", "id", l.frente_id)
    }
    if (tabela === "checkups") fk("clientes", "id", l.cliente_id)
    if (tabela === "clientes" && !["operacao", "loja_em_criacao"].includes(String(l.tipo))) {
      throw new ErroBanco("check tipo")
    }
    if (tabela === "frentes") {
      if (!(Number(l.prazo_dias) > 0) || !(Number(l.critico_apos_dias) > 0)) {
        throw new ErroBanco("check frentes")
      }
    }
    void indice
  }

  async selecionar(tabela: Tabela, opcoes: OpcoesSelecao = {}): Promise<Linha[]> {
    this.registrar("selecionar", tabela)
    let linhas = this.tabelas[tabela].filter((l) =>
      Object.entries(opcoes.onde ?? {}).every(([c, v]) => l[c] === v)
    )
    const ord = opcoes.ordenarPor ?? []
    if (ord.length > 0) {
      linhas = [...linhas].sort((a, b) => {
        for (const c of ord) {
          const x = a[c] as string | number
          const y = b[c] as string | number
          if (x < y) return -1
          if (x > y) return 1
        }
        return 0
      })
    }
    return linhas.map((l) => ({ ...l }))
  }

  async inserir(tabela: Tabela, linhas: Linha[]): Promise<void> {
    this.registrar("inserir", tabela)
    // Atômico por chamada (como um INSERT de várias linhas no Postgres).
    const novas: Linha[] = []
    linhas.forEach((l, i) => {
      const completa = { ...DEFAULTS[tabela], ...l }
      this.validar(tabela, completa, i)
      const k = this.chave(tabela, completa)
      const duplicada =
        this.tabelas[tabela].some((x) => this.chave(tabela, x) === k) ||
        novas.some((x) => this.chave(tabela, x) === k)
      if (duplicada) throw new ErroBanco(`chave duplicada em ${tabela}`)
      novas.push(completa)
    })
    this.tabelas[tabela].push(...novas)
  }

  async upsert(tabela: Tabela, linhas: Linha[], colunaConflito: string): Promise<void> {
    this.registrar("upsert", tabela)
    for (const l of linhas) {
      const i = this.tabelas[tabela].findIndex((x) => x[colunaConflito] === l[colunaConflito])
      const completa = { ...DEFAULTS[tabela], ...(i >= 0 ? this.tabelas[tabela][i] : {}), ...l }
      this.validar(tabela, completa, 0)
      if (i >= 0) this.tabelas[tabela][i] = completa
      else this.tabelas[tabela].push(completa)
    }
  }

  async atualizar(tabela: Tabela, valores: Linha, coluna: string, valor: string | number): Promise<void> {
    this.registrar("atualizar", tabela)
    for (const l of this.tabelas[tabela]) {
      if (l[coluna] !== valor) continue
      const novo = { ...l, ...valores }
      this.validar(tabela, novo, 0)
      Object.assign(l, valores)
    }
  }

  private bloqueadoPorFilhos(tabela: Tabela, linha: Linha): boolean {
    if (tabela === "clientes") {
      return ["acoes", "checkups", "cliente_frentes"].some((t) =>
        this.tabelas[t as Tabela].some((x) => x.cliente_id === linha.id)
      )
    }
    if (tabela === "frentes") {
      return ["acoes", "cliente_frentes"].some((t) =>
        this.tabelas[t as Tabela].some((x) => x.frente_id === linha.id)
      )
    }
    return false
  }

  async remover(tabela: Tabela, coluna: string, valores: string[]): Promise<void> {
    this.registrar("remover", tabela)
    const alvo = this.tabelas[tabela].filter((l) => valores.includes(String(l[coluna])))
    if (alvo.some((l) => this.bloqueadoPorFilhos(tabela, l))) {
      throw new ErroBanco(`FK impede remover de ${tabela}`)
    }
    this.tabelas[tabela] = this.tabelas[tabela].filter((l) => !alvo.includes(l))
  }

  async removerTudo(tabela: Tabela, colunaChave: string): Promise<void> {
    this.registrar("removerTudo", tabela)
    const alvo = this.tabelas[tabela].filter((l) => l[colunaChave] != null)
    if (alvo.some((l) => this.bloqueadoPorFilhos(tabela, l))) {
      throw new ErroBanco(`FK impede limpar ${tabela}`)
    }
    this.tabelas[tabela] = this.tabelas[tabela].filter((l) => !alvo.includes(l))
  }
}
