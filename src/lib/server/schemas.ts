import { isValid, parseISO } from "date-fns"
import { z } from "zod"

import type { Setor } from "../domain/types"

/**
 * Validação de entrada dos endpoints (zod). Texto sempre com tamanho máximo;
 * datas ISO `yyyy-MM-dd` reais; enums fechados; objetos estritos (chave
 * desconhecida é rejeitada).
 */
const SETORES_VALIDOS = [
  "Mídia paga",
  "CRM & Automação",
  "CRO & UX",
  "Comunicação",
  "Conteúdo",
  "Materiais",
  "Redação",
  "Desenvolvimento",
] as const satisfies readonly Setor[]

export const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato aaaa-mm-dd.")
  .refine((v) => isValid(parseISO(v)), "Data inexistente.")

export const idTexto = z
  .string()
  .min(1, "Obrigatório.")
  .max(80, "Máximo de 80 caracteres.")
  .regex(/^[A-Za-z0-9._:-]+$/, "Use só letras, números, ponto, traço, dois-pontos e sublinhado.")

const textoCurto = (max: number) =>
  z.string().trim().min(1, "Obrigatório.").max(max, `Máximo de ${max} caracteres.`)

export const statusAcao = z.enum(["concluida", "em_andamento", "aguardando_aprovacao"])
export const origemAcao = z.enum(["seed", "manual", "checkup", "planilha"])
export const setor = z.enum(SETORES_VALIDOS)
export const resultadoAds = z.enum(["estavel", "caindo", "subindo"])

const diasPositivos = (max: number) => z.number().int().min(1).max(max)

export const novaAcaoSchema = z.strictObject({
  id: idTexto.optional(),
  clientId: idTexto,
  frenteId: idTexto,
  titulo: textoCurto(200),
  data: dataIso,
  status: statusAcao,
  responsavel: z.string().trim().max(80).optional(),
})

export const statusAcaoSchema = z.strictObject({ status: statusAcao })

export const checkupSchema = z.strictObject({
  id: idTexto.optional(),
  clientId: idTexto,
  /** Data do check-up (o "hoje" do app). */
  data: dataIso,
  entradas: z
    .array(
      z.strictObject({
        frenteId: idTexto,
        /** Vazio = não alterar. */
        data: z.union([dataIso, z.literal("")]),
      })
    )
    .max(50),
  resultadoAds: resultadoAds.optional(),
})

export const frenteSchema = z
  .strictObject({
    prazoDias: diasPositivos(3650).optional(),
    criticoAposDias: diasPositivos(7300).optional(),
  })
  .refine(
    (v) => v.prazoDias !== undefined || v.criticoAposDias !== undefined,
    "Informe prazoDias e/ou criticoAposDias."
  )
  .refine(
    (v) =>
      v.prazoDias === undefined ||
      v.criticoAposDias === undefined ||
      v.criticoAposDias > v.prazoDias,
    "criticoAposDias deve ser maior que prazoDias."
  )

export const atribuicaoSchema = z.strictObject({
  oportunidadeId: z
    .string()
    .max(200)
    .regex(
      /^(parada|aprovacao):[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/,
      "Formato esperado: tipo:cliente:frente."
    ),
  setor,
  data: dataIso,
  texto: z.string().max(2000),
})

export const configuracaoParcialSchema = z
  .strictObject({
    limiteAprovacaoDias: diasPositivos(365).optional(),
    bloqueioContratualDias: diasPositivos(3650).optional(),
    dataReferencia: dataIso.optional(),
    usarHojeReal: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Informe ao menos um campo.")

export const configuracaoSchema = z.strictObject({
  limiteAprovacaoDias: diasPositivos(365),
  bloqueioContratualDias: diasPositivos(3650),
  dataReferencia: dataIso,
  usarHojeReal: z.boolean(),
})

export const datasetSchema = z.strictObject({
  clients: z
    .array(
      z.strictObject({
        id: idTexto,
        nome: textoCurto(120),
        nicho: z.string().trim().max(120),
        tipo: z.enum(["operacao", "loja_em_criacao"]),
        responsavel: z.string().trim().max(80),
        ativo: z.boolean(),
      })
    )
    .max(500),
  frentes: z
    .array(
      z
        .strictObject({
          id: idTexto,
          nome: textoCurto(120),
          setor,
          prazoDias: diasPositivos(3650),
          criticoAposDias: diasPositivos(7300),
        })
        .refine((f) => f.criticoAposDias > f.prazoDias, "criticoAposDias deve ser maior que prazoDias.")
    )
    .max(50),
  contratos: z
    .array(z.strictObject({ clientId: idTexto, frenteId: idTexto }))
    .max(5000)
    .optional(),
  acoes: z
    .array(
      z.strictObject({
        id: idTexto,
        clientId: idTexto,
        frenteId: idTexto,
        titulo: textoCurto(200),
        data: dataIso,
        status: statusAcao,
        aguardandoDesde: dataIso.optional(),
        origem: origemAcao.optional(),
        responsavel: z.string().trim().max(80).optional(),
        criadaEm: dataIso.optional(),
        concluidaEm: dataIso.optional(),
      })
    )
    .max(20000),
  checkups: z
    .array(
      z.strictObject({
        id: idTexto,
        clientId: idTexto,
        data: dataIso,
        resultadoAds: resultadoAds.optional(),
      })
    )
    .max(5000),
  atribuicoes: z.array(atribuicaoSchema).max(5000),
  configuracao: configuracaoSchema.optional(),
})

/** Parâmetro de rota `[id]`. */
export const idRotaSchema = idTexto
