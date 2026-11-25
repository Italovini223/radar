import { SETORES, type Setor } from "./types"

/**
 * Rótulo curto de frente para espaços apertados (grade, selects, cartões).
 * Só afeta a tela: o dado (`Frente.nome`) não muda.
 */
const NOMES_CURTOS: Record<string, string> = {
  desenvolvimento: "Desenvolvimento",
}

export function nomeCurtoFrente(f: { id: string; nome: string }): string {
  return NOMES_CURTOS[f.id] ?? f.nome
}

/**
 * Setores que têm frente no dado atual, na ordem de `SETORES`. Os filtros por
 * setor da tela usam isto: setores antigos sem frente (Conteúdo, Materiais,
 * Redação) não viram opção vazia.
 */
export function setoresDasFrentes(frentes: readonly { setor: Setor }[]): Setor[] {
  const presentes = new Set(frentes.map((f) => f.setor))
  return SETORES.filter((s) => presentes.has(s))
}
