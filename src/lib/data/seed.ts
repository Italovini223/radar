import { parseISO } from "date-fns"

import type { RadarSnapshot } from "../domain/types"
import { montarPlanilha } from "./planilha-dataset"

/**
 * Dataset de demonstração: a planilha real (`planilha-dataset.ts`, 10 clientes,
 * 8 frentes, 172 tarefas). As datas são absolutas (referência 2026-11-13, ver
 * `configuracao.dataReferencia`), não relativas a "hoje". A fixture sintética
 * (`gabarito-fixture.ts`) existe só para testes unitários.
 */
export function buildSeed(): RadarSnapshot {
  return montarPlanilha()
}

/** Utilitário para testes: interpreta uma data ISO como "hoje". */
export function hojeDe(iso: string): Date {
  return parseISO(iso)
}
