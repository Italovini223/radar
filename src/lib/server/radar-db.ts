import {
  aplicarCheckup,
  novoId,
  type EntradaCheckup,
  type ResultadoCheckup,
} from "../domain/checkup"
import {
  CONFIGURACAO_PADRAO,
  type Acao,
  type Atribuicao,
  type Checkup,
  type Configuracao,
  type Frente,
  type RadarSnapshot,
  type ResultadoAds,
  type StatusAcao,
} from "../domain/types"
import { buildSeed } from "../data/seed"
import type { Banco, Linha, Tabela } from "./banco"
import { ErroConflito, ErroNaoEncontrado, ErroRegra } from "./errors"
import {
  acaoDeLinha,
  acaoParaLinha,
  atribuicaoDeLinha,
  atribuicaoParaLinha,
  checkupDeLinha,
  checkupParaLinha,
  clienteDeLinha,
  clienteParaLinha,
  configuracaoDeLinha,
  configuracaoParaLinha,
  contratoDeLinha,
  contratoParaLinha,
  frenteDeLinha,
  frenteParaLinha,
} from "./mapeamento"

/**
 * Operações do Radar sobre a interface mínima `Banco` (Supabase em produção,
 * fake em memória nos testes). Nenhuma delas conhece HTTP.
 *
 * Atenção: o supabase-js não tem transação. Operações com mais de uma escrita
 * (checkup, importar) são "transações lógicas": validam antes, escrevem na
 * ordem que menos perde dado e, no importar, restauram o conteúdo anterior se
 * algo falhar no meio.
 */

/** Ordem de remoção (filhos antes dos pais); a inserção usa a ordem inversa. */
const ORDEM_REMOCAO: ReadonlyArray<[Tabela, string]> = [
  ["atribuicoes", "oportunidade_id"],
  ["checkups", "id"],
  ["acoes", "id"],
  ["cliente_frentes", "cliente_id"],
  ["frentes", "id"],
  ["clientes", "id"],
]

export async function carregarSnapshot(banco: Banco): Promise<RadarSnapshot> {
  const [clientes, frentes, contratos, acoes, checkups, atribuicoes, config] =
    await Promise.all([
      banco.selecionar("clientes", { ordenarPor: ["nome"] }),
      banco.selecionar("frentes", { ordenarPor: ["ordem", "id"] }),
      banco.selecionar("cliente_frentes", { ordenarPor: ["cliente_id", "frente_id"] }),
      banco.selecionar("acoes", { ordenarPor: ["data", "id"] }),
      banco.selecionar("checkups", { ordenarPor: ["data", "id"] }),
      banco.selecionar("atribuicoes", { ordenarPor: ["data", "oportunidade_id"] }),
      banco.selecionar("configuracoes", { onde: { id: 1 } }),
    ])
  return {
    clients: clientes.map(clienteDeLinha),
    frentes: frentes.map(frenteDeLinha),
    contratos: contratos.map(contratoDeLinha),
    acoes: acoes.map(acaoDeLinha),
    checkups: checkups.map(checkupDeLinha),
    atribuicoes: atribuicoes.map(atribuicaoDeLinha),
    configuracao: configuracaoDeLinha(config[0]),
  }
}

async function existe(
  banco: Banco,
  tabela: Tabela,
  coluna: string,
  valor: string
): Promise<boolean> {
  return (await banco.selecionar(tabela, { onde: { [coluna]: valor } })).length > 0
}

async function exigir(
  banco: Banco,
  tabela: Tabela,
  coluna: string,
  valor: string,
  entidade: string
): Promise<void> {
  if (!(await existe(banco, tabela, coluna, valor))) {
    throw new ErroNaoEncontrado(entidade)
  }
}

/** Sem nenhuma linha em cliente_frentes, todas as frentes valem (compatibilidade). */
async function exigirContrato(
  banco: Banco,
  clientId: string,
  frenteId: string
): Promise<void> {
  const todos = await banco.selecionar("cliente_frentes")
  if (todos.length === 0) return
  const contratado = todos.some(
    (l) => l.cliente_id === clientId && l.frente_id === frenteId
  )
  if (!contratado) {
    throw new ErroRegra("O cliente não contratou esta frente.")
  }
}

export interface NovaAcao {
  id?: string
  clientId: string
  frenteId: string
  titulo: string
  data: string
  status: StatusAcao
  responsavel?: string
}

export async function registrarAcao(banco: Banco, entrada: NovaAcao): Promise<Acao> {
  await exigir(banco, "clientes", "id", entrada.clientId, "Cliente")
  await exigir(banco, "frentes", "id", entrada.frenteId, "Frente")
  await exigirContrato(banco, entrada.clientId, entrada.frenteId)
  const id = entrada.id ?? novoId("acao")
  if (await existe(banco, "acoes", "id", id)) {
    throw new ErroConflito("Já existe uma ação com este id.")
  }
  const acao: Acao = {
    id,
    clientId: entrada.clientId,
    frenteId: entrada.frenteId,
    titulo: entrada.titulo,
    data: entrada.data,
    status: entrada.status,
    aguardandoDesde:
      entrada.status === "aguardando_aprovacao" ? entrada.data : undefined,
    origem: "manual",
    responsavel: entrada.responsavel || undefined,
  }
  const linha = acaoParaLinha(acao)
  await banco.inserir("acoes", [linha])
  return acaoDeLinha(linha)
}

export async function atualizarStatusAcao(
  banco: Banco,
  id: string,
  status: StatusAcao
): Promise<Acao> {
  const [atual] = await banco.selecionar("acoes", { onde: { id } })
  if (!atual) throw new ErroNaoEncontrado("Ação")
  const acao = acaoDeLinha(atual)
  const nova: Acao = {
    ...acao,
    status,
    aguardandoDesde:
      status === "aguardando_aprovacao"
        ? (acao.aguardandoDesde ?? acao.data)
        : undefined,
    concluidaEm:
      status === "concluida" ? (acao.concluidaEm ?? acao.data) : undefined,
  }
  const linha = acaoParaLinha(nova)
  await banco.atualizar(
    "acoes",
    {
      status: linha.status,
      aguardando_desde: linha.aguardando_desde,
      concluida_em: linha.concluida_em,
    },
    "id",
    id
  )
  return acaoDeLinha(linha)
}

export interface EntradaSalvarCheckup {
  id?: string
  clientId: string
  /** Data do check-up (o "hoje" do app), ISO. */
  data: string
  entradas: EntradaCheckup[]
  resultadoAds?: ResultadoAds
}

/**
 * Reusa `aplicarCheckup` do domínio e persiste o diff: insere as ações novas e
 * remove as substituídas (data mais antiga corrige o histórico). Ordem:
 * inserir, remover, registrar o check-up.
 */
export async function salvarCheckup(
  banco: Banco,
  entrada: EntradaSalvarCheckup
): Promise<ResultadoCheckup> {
  await exigir(banco, "clientes", "id", entrada.clientId, "Cliente")
  const id = entrada.id ?? novoId("checkup")
  if (await existe(banco, "checkups", "id", id)) {
    throw new ErroConflito("Já existe um check-up com este id.")
  }
  const [frentes, acoesLinhas, contratos] = await Promise.all([
    banco.selecionar("frentes").then((l) => l.map(frenteDeLinha)),
    banco.selecionar("acoes", { onde: { cliente_id: entrada.clientId } }),
    banco.selecionar("cliente_frentes", { onde: { cliente_id: entrada.clientId } }),
  ])
  const antes = acoesLinhas.map(acaoDeLinha)
  // Só frentes contratadas (se o cliente tem contratos cadastrados).
  const contratadas = new Set(contratos.map((l) => String(l.frente_id)))
  const entradas =
    contratadas.size === 0
      ? entrada.entradas
      : entrada.entradas.filter((e) => contratadas.has(e.frenteId))

  const resultado = aplicarCheckup(antes, frentes, entrada.clientId, entradas)
  const idsAntes = new Set(antes.map((a) => a.id))
  const idsDepois = new Set(resultado.acoes.map((a) => a.id))
  const inseridas = resultado.acoes.filter((a) => !idsAntes.has(a.id))
  const removidas = antes.filter((a) => !idsDepois.has(a.id)).map((a) => a.id)

  if (inseridas.length > 0) {
    await banco.inserir("acoes", inseridas.map(acaoParaLinha))
  }
  if (removidas.length > 0) await banco.remover("acoes", "id", removidas)

  const checkup: Checkup = {
    id,
    clientId: entrada.clientId,
    data: entrada.data,
    resultadoAds: entrada.resultadoAds,
  }
  await banco.inserir("checkups", [checkupParaLinha(checkup)])

  return {
    alteradas: resultado.alteradas,
    acoes: resultado.acoes.map((a) => acaoDeLinha(acaoParaLinha(a))),
    checkup,
  }
}

/** Atualiza prazo e/ou "vira crítico após" de uma frente. */
export async function atualizarFrente(
  banco: Banco,
  id: string,
  campos: { prazoDias?: number; criticoAposDias?: number }
): Promise<Frente> {
  const [atual] = await banco.selecionar("frentes", { onde: { id } })
  if (!atual) throw new ErroNaoEncontrado("Frente")
  const frente = frenteDeLinha(atual)
  const nova: Frente = {
    ...frente,
    prazoDias: campos.prazoDias ?? frente.prazoDias,
    criticoAposDias: campos.criticoAposDias ?? frente.criticoAposDias,
  }
  if (nova.criticoAposDias <= nova.prazoDias) {
    throw new ErroRegra("O limite crítico deve ser maior que o prazo da frente.")
  }
  await banco.atualizar(
    "frentes",
    { prazo_dias: nova.prazoDias, critico_apos_dias: nova.criticoAposDias },
    "id",
    id
  )
  return nova
}

export async function atribuir(banco: Banco, a: Atribuicao): Promise<Atribuicao> {
  // `oportunidade_id` é a chave: atribuir de novo substitui a anterior.
  await banco.upsert("atribuicoes", [atribuicaoParaLinha(a)], "oportunidade_id")
  return a
}

export async function atualizarConfiguracao(
  banco: Banco,
  parcial: Partial<Configuracao>
): Promise<Configuracao> {
  const [linha] = await banco.selecionar("configuracoes", { onde: { id: 1 } })
  const atual = configuracaoDeLinha(linha)
  const nova: Configuracao = {
    limiteAprovacaoDias: parcial.limiteAprovacaoDias ?? atual.limiteAprovacaoDias,
    bloqueioContratualDias:
      parcial.bloqueioContratualDias ?? atual.bloqueioContratualDias,
    dataReferencia: parcial.dataReferencia ?? atual.dataReferencia,
    usarHojeReal: parcial.usarHojeReal ?? atual.usarHojeReal,
  }
  await banco.upsert("configuracoes", [configuracaoParaLinha(nova)], "id")
  return nova
}

/** Integridade do dataset antes de tocar no banco (evita importação pela metade). */
export function validarDataset(d: RadarSnapshot): void {
  const unicos = (ids: string[], nome: string) => {
    if (new Set(ids).size !== ids.length) {
      throw new ErroRegra(`Há ids repetidos em ${nome}.`)
    }
  }
  unicos(d.clients.map((c) => c.id), "clientes")
  unicos(d.frentes.map((f) => f.id), "frentes")
  unicos(d.acoes.map((a) => a.id), "ações")
  unicos(d.checkups.map((c) => c.id), "check-ups")
  unicos(d.atribuicoes.map((a) => a.oportunidadeId), "atribuições")
  const clientes = new Set(d.clients.map((c) => c.id))
  const frentes = new Set(d.frentes.map((f) => f.id))
  const contratos = d.contratos ?? []
  unicos(contratos.map((c) => `${c.clientId}|${c.frenteId}`), "contratos")
  const refInvalida = (cid: string, fid?: string) =>
    !clientes.has(cid) || (fid !== undefined && !frentes.has(fid))
  if (contratos.some((c) => refInvalida(c.clientId, c.frenteId))) {
    throw new ErroRegra("Há contratos que apontam para cliente ou frente inexistente.")
  }
  if (d.acoes.some((a) => refInvalida(a.clientId, a.frenteId))) {
    throw new ErroRegra("Há ações que apontam para cliente ou frente inexistente.")
  }
  if (d.checkups.some((c) => refInvalida(c.clientId))) {
    throw new ErroRegra("Há check-ups que apontam para cliente inexistente.")
  }
}

async function lerTabelas(banco: Banco): Promise<Array<[Tabela, Linha[]]>> {
  const tabelas: Tabela[] = [
    "clientes",
    "frentes",
    "cliente_frentes",
    "acoes",
    "checkups",
    "atribuicoes",
  ]
  return Promise.all(
    tabelas.map(async (t): Promise<[Tabela, Linha[]]> => [t, await banco.selecionar(t)])
  )
}

async function limparTudo(banco: Banco): Promise<void> {
  for (const [tabela, chave] of ORDEM_REMOCAO) await banco.removerTudo(tabela, chave)
}

async function gravarTabelas(
  banco: Banco,
  tabelas: ReadonlyArray<[Tabela, Linha[]]>
): Promise<void> {
  // Pais antes dos filhos.
  const ordem: Tabela[] = [
    "clientes",
    "frentes",
    "cliente_frentes",
    "acoes",
    "checkups",
    "atribuicoes",
  ]
  for (const t of ordem) {
    const linhas = tabelas.find(([nome]) => nome === t)?.[1] ?? []
    if (linhas.length > 0) await banco.inserir(t, linhas)
  }
}

/**
 * Substitui o conteúdo de demonstração (clientes, frentes, contratos, ações,
 * check-ups e atribuições) pelo dataset, mantendo/ajustando a configuração.
 * "Transação lógica": valida; guarda cópia do conteúdo atual; limpa e
 * regrava; se algo falhar, tenta restaurar a cópia e relança o erro.
 */
export async function importarDataset(
  banco: Banco,
  dataset: Omit<RadarSnapshot, "configuracao"> & { configuracao?: Configuracao }
): Promise<RadarSnapshot> {
  const d: RadarSnapshot = {
    ...dataset,
    configuracao: dataset.configuracao ?? { ...CONFIGURACAO_PADRAO },
  }
  validarDataset(d)

  const novas: Array<[Tabela, Linha[]]> = [
    ["clientes", d.clients.map(clienteParaLinha)],
    ["frentes", d.frentes.map((f, i) => frenteParaLinha(f, i))],
    ["cliente_frentes", (d.contratos ?? []).map(contratoParaLinha)],
    [
      "acoes",
      d.acoes.map((a) => acaoParaLinha({ ...a, origem: a.origem ?? "planilha" })),
    ],
    ["checkups", d.checkups.map(checkupParaLinha)],
    ["atribuicoes", d.atribuicoes.map(atribuicaoParaLinha)],
  ]
  // Sem contratos no dataset, todas as frentes valem para todos os clientes.
  // Materializa o produto cartesiano para que o snapshot carregado seja exato.
  if ((d.contratos ?? []).length === 0) {
    novas[2] = [
      "cliente_frentes",
      d.clients.flatMap((c) =>
        d.frentes.map((f) => contratoParaLinha({ clientId: c.id, frenteId: f.id }))
      ),
    ]
  }

  const backup = await lerTabelas(banco)
  const [linhaConfig] = await banco.selecionar("configuracoes", { onde: { id: 1 } })
  try {
    await limparTudo(banco)
    await gravarTabelas(banco, novas)
    await banco.upsert("configuracoes", [configuracaoParaLinha(d.configuracao)], "id")
  } catch (erro) {
    try {
      await limparTudo(banco)
      await gravarTabelas(banco, backup)
      if (linhaConfig) await banco.upsert("configuracoes", [linhaConfig], "id")
    } catch {
      // Restauração também falhou: o erro original é o que importa; o log do
      // servidor (tratarErro) registra a falha.
    }
    throw erro
  }
  return carregarSnapshot(banco)
}

/** Reimporta a fixture de demonstração (substitui tudo, inclusive a configuração). */
export async function resetar(banco: Banco): Promise<RadarSnapshot> {
  return importarDataset(banco, buildSeed())
}
