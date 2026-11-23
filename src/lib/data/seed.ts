import { parseISO } from "date-fns"

import type { RadarSnapshot } from "../domain/types"
import { montarGabarito } from "./gabarito-fixture"

/**
 * Dataset de demonstração. Por enquanto é a fixture sintética do gabarito
 * (`gabarito-fixture.ts`); será substituído pelo dataset real exportado da
 * planilha. As datas são absolutas (referência 2026-11-13, ver
 * `configuracao.dataReferencia`), não relativas a "hoje".
 */
export function buildSeed(): RadarSnapshot {
  return montarGabarito()
}

/** Utilitário para testes: interpreta uma data ISO como "hoje". */
export function hojeDe(iso: string): Date {
  return parseISO(iso)
}
