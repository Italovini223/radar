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
