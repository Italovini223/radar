import { ultimaAcaoConcluida } from "./rules"
import type { Acao, Checkup, Frente } from "./types"
import { nomeCurtoFrente } from "./frentes"

export interface EntradaCheckup {
  frenteId: string
  /** Data aproximada da última ação, ISO `yyyy-MM-dd`. Vazio = não alterar. */
  data: string
}

/** Resultado de salvar um check-up no servidor (o cliente reconcilia com isto). */
export interface ResultadoCheckup {
  /** Frentes cuja última ação mudou. */
  alteradas: string[]
  /** Ações do cliente depois do check-up. */
  acoes: Acao[]
  checkup: Checkup
}

let contador = 0
export function novoId(prefixo: string): string {
  contador += 1
  return `${prefixo}-${Date.now().toString(36)}${contador.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

/**
 * Aplica um check-up: a data informada passa a ser a "última ação concluída"
 * da frente (o check-up é autoritativo na v1).
 *
 * - data igual à atual: nada muda;
 * - data mais recente: nova ação concluída (origem "checkup");
 * - data mais antiga: ações concluídas posteriores à data informada são
 *   substituídas por uma única ação de check-up (correção de histórico).
 */
export function aplicarCheckup(
  acoes: readonly Acao[],
  frentes: readonly Frente[],
  clientId: string,
  entradas: readonly EntradaCheckup[]
): { acoes: Acao[]; alteradas: string[] } {
  let atual = [...acoes]
  const alteradas: string[] = []

  for (const e of entradas) {
    if (!e.data) continue
    const frente = frentes.find((f) => f.id === e.frenteId)
    if (!frente) continue
    const ultima = ultimaAcaoConcluida(atual, clientId, e.frenteId)
    if (ultima && ultima.data === e.data) continue

    if (ultima && e.data < ultima.data) {
      atual = atual.filter(
        (a) =>
          !(
            a.clientId === clientId &&
            a.frenteId === e.frenteId &&
            a.status === "concluida" &&
            a.data > e.data
          )
      )
    }
    atual.push({
      id: novoId("acao"),
      clientId,
      frenteId: e.frenteId,
      titulo: `Check-up: última ação em ${nomeCurtoFrente(frente)}`,
      data: e.data,
      status: "concluida",
      origem: "checkup",
    })
    alteradas.push(e.frenteId)
  }

  return { acoes: atual, alteradas }
}
