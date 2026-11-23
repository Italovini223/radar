/**
 * Qual banco o servidor usa. `RADAR_DB=memoria` (semeado com a fixture) ou
 * `RADAR_DB=memoria-vazia` troca o Supabase por um banco em memória SÓ FORA
 * de produção: em produção a variável é IGNORADA, para que o fake nunca
 * seja habilitado onde há dados de verdade.
 */
export type ModoBanco = "supabase" | "memoria" | "memoria-vazia"

export function modoDoBanco(env: {
  RADAR_DB?: string
  NODE_ENV?: string
}): ModoBanco {
  if (env.NODE_ENV === "production") return "supabase"
  if (env.RADAR_DB === "memoria") return "memoria"
  if (env.RADAR_DB === "memoria-vazia") return "memoria-vazia"
  return "supabase"
}
