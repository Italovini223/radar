import type { ZodType } from "zod"

import { ErroApp, ErroEntrada, type CampoInvalido } from "./errors"

/**
 * Respostas JSON consistentes:
 *   sucesso: { ok: true, dados }
 *   erro:    { ok: false, erro: { codigo, mensagem, campos? } }
 * Nunca cacheadas. Erro inesperado = 500 genérico (detalhe só no log).
 */
const CABECALHOS = { "Cache-Control": "no-store" }

export function ok<T>(dados: T, status = 200): Response {
  return Response.json({ ok: true, dados }, { status, headers: CABECALHOS })
}

export function falha(
  status: number,
  codigo: string,
  mensagem: string,
  campos?: CampoInvalido[]
): Response {
  return Response.json(
    { ok: false, erro: { codigo, mensagem, ...(campos ? { campos } : {}) } },
    { status, headers: CABECALHOS }
  )
}

export function tratarErro(erro: unknown): Response {
  if (erro instanceof ErroApp) {
    return falha(erro.status, erro.codigo, erro.message, erro.campos)
  }
  // Só a mensagem, para não despejar objetos de erro (que podem conter
  // cabeçalhos/URLs do banco) nos logs.
  console.error(
    "[radar-api] erro inesperado:",
    erro instanceof Error ? erro.message : "desconhecido"
  )
  return falha(500, "ERRO_INTERNO", "Erro interno. Tente novamente em instantes.")
}

/** Executa um handler convertendo qualquer exceção em resposta JSON. */
export async function executar(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (erro) {
    return tratarErro(erro)
  }
}

export const LIMITE_CORPO_PADRAO = 100_000
export const LIMITE_CORPO_IMPORTAR = 8_000_000

/** Lê o corpo JSON com limite de tamanho e valida com zod. */
export async function lerCorpo<T>(
  req: Request,
  schema: ZodType<T>,
  limiteBytes = LIMITE_CORPO_PADRAO
): Promise<T> {
  const declarado = Number(req.headers.get("content-length") ?? 0)
  if (declarado > limiteBytes) {
    throw new ErroApp(413, "CORPO_GRANDE_DEMAIS", "Corpo da requisição grande demais.")
  }
  const bruto = await req.text()
  if (bruto.length > limiteBytes) {
    throw new ErroApp(413, "CORPO_GRANDE_DEMAIS", "Corpo da requisição grande demais.")
  }
  let json: unknown
  try {
    json = JSON.parse(bruto)
  } catch {
    throw new ErroApp(400, "JSON_INVALIDO", "O corpo da requisição não é um JSON válido.")
  }
  return validar(schema, json)
}

export function validar<T>(schema: ZodType<T>, valor: unknown): T {
  const r = schema.safeParse(valor)
  if (r.success) return r.data
  throw new ErroEntrada(
    "Dados inválidos.",
    r.error.issues.slice(0, 20).map((i) => ({
      caminho: i.path.join(".") || "(raiz)",
      mensagem: i.message,
    }))
  )
}
