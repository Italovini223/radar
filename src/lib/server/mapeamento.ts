import type { Linha } from "./banco"
import {
  CONFIGURACAO_PADRAO,
  type Acao,
  type Atribuicao,
  type Checkup,
  type Client,
  type Configuracao,
  type Contrato,
  type Frente,
  type OrigemAcao,
  type ResultadoAds,
  type Setor,
  type StatusAcao,
  type TipoCliente,
} from "../domain/types"

/**
 * Mapeamento linhas do banco (snake_case) <-> domínio (camelCase).
 * Colunas `date` chegam como "yyyy-MM-dd".
 */
const texto = (v: unknown): string => (v == null ? "" : String(v))
const data = (v: unknown): string => texto(v).slice(0, 10)
const dataOuUndefined = (v: unknown): string | undefined =>
  v == null || v === "" ? undefined : data(v)
const textoOuUndefined = (v: unknown): string | undefined =>
  v == null || v === "" ? undefined : String(v)

export function clienteDeLinha(l: Linha): Client {
  return {
    id: texto(l.id),
    nome: texto(l.nome),
    nicho: texto(l.nicho),
    tipo: (l.tipo === "loja_em_criacao" ? "loja_em_criacao" : "operacao") satisfies TipoCliente,
    responsavel: texto(l.responsavel),
    ativo: l.ativo !== false,
  }
}

export function clienteParaLinha(c: Client): Linha {
  return {
    id: c.id,
    nome: c.nome,
    nicho: c.nicho,
    tipo: c.tipo,
    responsavel: c.responsavel,
    ativo: c.ativo,
  }
}

export function frenteDeLinha(l: Linha): Frente {
  return {
    id: texto(l.id),
    nome: texto(l.nome),
    setor: texto(l.setor) as Setor,
    prazoDias: Number(l.prazo_dias),
    criticoAposDias: Number(l.critico_apos_dias),
  }
}

export function frenteParaLinha(f: Frente, ordem: number): Linha {
  return {
    id: f.id,
    nome: f.nome,
    setor: f.setor,
    prazo_dias: f.prazoDias,
    critico_apos_dias: f.criticoAposDias,
    ordem,
  }
}

export function contratoDeLinha(l: Linha): Contrato {
  return { clientId: texto(l.cliente_id), frenteId: texto(l.frente_id) }
}

export function contratoParaLinha(c: Contrato): Linha {
  return { cliente_id: c.clientId, frente_id: c.frenteId }
}

export function acaoDeLinha(l: Linha): Acao {
  const acao: Acao = {
    id: texto(l.id),
    clientId: texto(l.cliente_id),
    frenteId: texto(l.frente_id),
    titulo: texto(l.titulo),
    data: data(l.data),
    status: texto(l.status) as StatusAcao,
  }
  const aguardandoDesde = dataOuUndefined(l.aguardando_desde)
  if (aguardandoDesde) acao.aguardandoDesde = aguardandoDesde
  const origem = textoOuUndefined(l.origem)
  if (origem) acao.origem = origem as OrigemAcao
  const responsavel = textoOuUndefined(l.responsavel)
  if (responsavel) acao.responsavel = responsavel
  const criadaEm = dataOuUndefined(l.criada_em)
  if (criadaEm) acao.criadaEm = criadaEm
  const concluidaEm = dataOuUndefined(l.concluida_em)
  if (concluidaEm) acao.concluidaEm = concluidaEm
  return acao
}

/**
 * Preenche o que o domínio deixa opcional: `aguardando_desde` é obrigatório
 * para aguardando_aprovacao (check do banco) e nulo nos demais status.
 */
export function acaoParaLinha(a: Acao): Linha {
  return {
    id: a.id,
    cliente_id: a.clientId,
    frente_id: a.frenteId,
    titulo: a.titulo,
    status: a.status,
    responsavel: a.responsavel ?? "",
    criada_em: a.criadaEm ?? a.data,
    concluida_em:
      a.status === "concluida" ? (a.concluidaEm ?? a.data) : null,
    data: a.data,
    aguardando_desde:
      a.status === "aguardando_aprovacao"
        ? (a.aguardandoDesde ?? a.data)
        : null,
    origem: a.origem ?? "manual",
  }
}

export function checkupDeLinha(l: Linha): Checkup {
  const c: Checkup = {
    id: texto(l.id),
    clientId: texto(l.cliente_id),
    data: data(l.data),
  }
  const r = textoOuUndefined(l.resultado_ads)
  if (r) c.resultadoAds = r as ResultadoAds
  return c
}

export function checkupParaLinha(c: Checkup): Linha {
  return {
    id: c.id,
    cliente_id: c.clientId,
    data: c.data,
    resultado_ads: c.resultadoAds ?? null,
  }
}

export function atribuicaoDeLinha(l: Linha): Atribuicao {
  return {
    oportunidadeId: texto(l.oportunidade_id),
    setor: texto(l.setor) as Setor,
    data: data(l.data),
    texto: texto(l.texto),
  }
}

export function atribuicaoParaLinha(a: Atribuicao): Linha {
  return {
    oportunidade_id: a.oportunidadeId,
    setor: a.setor,
    data: a.data,
    texto: a.texto,
  }
}

export function configuracaoDeLinha(l: Linha | undefined): Configuracao {
  if (!l) return { ...CONFIGURACAO_PADRAO }
  return {
    limiteAprovacaoDias: Number(l.limite_aprovacao_dias),
    bloqueioContratualDias: Number(l.bloqueio_contratual_dias),
    dataReferencia: data(l.data_referencia),
    usarHojeReal: l.usar_hoje_real === true,
  }
}

export function configuracaoParaLinha(c: Configuracao): Linha {
  return {
    id: 1,
    limite_aprovacao_dias: c.limiteAprovacaoDias,
    bloqueio_contratual_dias: c.bloqueioContratualDias,
    data_referencia: c.dataReferencia,
    usar_hoje_real: c.usarHojeReal,
  }
}
