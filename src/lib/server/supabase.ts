import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { BancoNaoConfiguradoError } from "./errors"

/**
 * Cliente Supabase SOMENTE no servidor, com a chave de serviço (ignora RLS;
 * as tabelas têm RLS ligado e nenhuma política, então só esta chave acessa).
 * Criado sob demanda: sem as variáveis, lança BANCO_NAO_CONFIGURADO.
 * Esta chave nunca pode ir para o bundle do navegador (`server-only`).
 */
let cache: { url: string; chave: string; cliente: SupabaseClient } | null = null

export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim()
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !chave) throw new BancoNaoConfiguradoError()
  if (!cache || cache.url !== url || cache.chave !== chave) {
    cache = {
      url,
      chave,
      cliente: createClient(url, chave, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    }
  }
  return cache.cliente
}
