import { formatarDias } from "../domain/opportunities"
import { DIAS_APROVACAO_TRAVADA } from "../domain/rules"
import type { Opportunity, Setor } from "../domain/types"

/**
 * Gerador SIMULADO de rascunho de proposta. Não chama nenhuma API de IA e não
 * decide nada: o alerta já veio da regra fixa. Existe só para mostrar o
 * fluxo "IA escreve o rascunho, uma pessoa revisa". Para usar Claude na Sprint
 * 3, implemente `ProposalGenerator` em outro arquivo e troque o export
 * `proposalGenerator` abaixo.
 */

export const AVISO_RASCUNHO = "Rascunho — revisar antes de enviar ao cliente"

export interface ProposalInput {
  oportunidade: Opportunity
  clienteNome: string
  frenteNome: string
  setor: Setor
  /** Título da ação aguardando aprovação (tipo "aprovacao"). */
  tituloAcao?: string
}

export interface Proposal {
  titulo: string
  /** Frase curta usada na nota do cartão. */
  resumo: string
  texto: string
  setorSugerido: Setor
  aviso: string
  geradoPor: "simulado"
}

export interface ProposalGenerator {
  gerar(input: ProposalInput): Promise<Proposal>
}

interface Modelo {
  /** Consequência de deixar a frente parada (uma frase). */
  impacto: string
  /** Proposta em si, sem a pergunta final. */
  corpo: string
  /** Pergunta final: varia por frente, para o texto não soar de molde. */
  pergunta: string
}

const MODELOS: Record<string, Modelo> = {
  "google-ads": {
    impacto:
      "Retomar as campanhas de busca ajuda a capturar demanda ativa que hoje passa sem resposta.",
    corpo:
      "Nossa sugestão é revisar a estrutura das campanhas de pesquisa, priorizar os produtos mais relevantes e definir um ciclo semanal de acompanhamento e otimização.",
    pergunta:
      "Faz sentido apresentarmos o plano de campanhas ainda esta semana?",
  },
  "meta-ads": {
    impacto: "Criativos e públicos costumam perder força sem renovação.",
    corpo:
      "Propomos renovar os criativos, testar novos públicos e revisar a campanha de remarketing, com acompanhamento quinzenal.",
    pergunta:
      "Quer que a gente leve um plano de testes de criativo para a próxima reunião?",
  },
  crm: {
    impacto:
      "Sem réguas ativas, compras iniciadas e clientes inativos deixam de ser abordados.",
    corpo:
      "Sugerimos desenhar ou revisar as réguas de relacionamento (carrinho abandonado, pós-compra e reativação), com segmentação e testes de mensagem.",
    pergunta:
      "Posso desenhar o primeiro fluxo piloto e mostrar para vocês antes de ir ao ar?",
  },
  cro: {
    impacto:
      "Pequenos atritos na jornada de compra acumulam perda de conversão.",
    corpo:
      "Propomos um diagnóstico da jornada (página de produto, carrinho e checkout) seguido de uma lista priorizada de testes.",
    pergunta:
      "Que dia da semana funciona melhor para apresentarmos o que encontrarmos?",
  },
  layout: {
    impacto: "A experiência pode não acompanhar o crescimento do catálogo.",
    corpo:
      "Sugerimos uma revisão de layout e navegação, atualizando vitrines, páginas de categoria e pontos principais de conversão, num escopo enxuto.",
    pergunta:
      "Vocês preferem começar pela home ou pelas páginas de categoria?",
  },
  conteudo: {
    impacto:
      "A pausa reduz presença orgânica e relacionamento com o público.",
    corpo:
      "Propomos retomar um calendário editorial orientado por oportunidades de busca e datas sazonais, com produção e acompanhamento mensal.",
    pergunta: "Quais datas do próximo mês são mais importantes para vocês?",
  },
  materiais: {
    impacto:
      "Peças desatualizadas enfraquecem campanhas e o atendimento comercial.",
    corpo:
      "Sugerimos atualizar o kit de peças (banners, apresentações e materiais de venda) alinhado às próximas campanhas.",
    pergunta:
      "Existe alguma campanha próxima que a gente deva priorizar nas peças?",
  },
  redacao: {
    impacto: "Textos de categoria e produto pedem revisão periódica.",
    corpo:
      "Propomos revisar as descrições de produto e os textos das principais páginas, mantendo o tom de voz da marca.",
    pergunta: "Podemos começar pelas páginas de maior tráfego?",
  },
}

const MODELO_PADRAO: Modelo = {
  impacto: "Sem acompanhamento, a frente perde ritmo.",
  corpo:
    "Sugerimos retomar o acompanhamento desta frente com um plano curto e prioridades claras.",
  pergunta: "Qual seria o melhor momento para alinharmos os próximos passos?",
}

const PERGUNTA_APROVACAO =
  "Conseguem nos dar um retorno até o fim da semana?"

/** "90 dias", ou "2 anos (730 dias)" quando passa de um ano. */
function diasExtenso(dias: number): string {
  return dias >= 365
    ? `${formatarDias(dias)} (${dias} dias)`
    : formatarDias(dias)
}

function situacao(o: Opportunity): string {
  if (o.tipo === "aprovacao") {
    return `com uma entrega aguardando aprovação há ${formatarDias(o.diasParado ?? 0)}`
  }
  if (o.nunca) return "sem nenhuma ação registrada"
  return `sem ação há ${formatarDias(o.diasParado ?? 0)}`
}

/** Consequência de deixar parado, em uma frase (linha do cartão do Radar). */
export function impactoDaOportunidade(input: ProposalInput): string {
  const o = input.oportunidade
  if (o.tipo === "aprovacao") {
    return "Um lembrete ao responsável evita atraso para o cliente."
  }
  return (MODELOS[o.frenteId] ?? MODELO_PADRAO).impacto
}

/** Frase curta de resumo (mesmo gerador, sem espera). */
export function resumoDaOportunidade(input: ProposalInput): string {
  const o = input.oportunidade
  if (o.tipo === "aprovacao") {
    return `A entrega "${input.tituloAcao ?? "pendente"}" está parada em aprovação. ${impactoDaOportunidade(input)}`
  }
  return `A frente de ${input.frenteNome} está ${situacao(o)}. ${impactoDaOportunidade(input)}`
}

function montar(input: ProposalInput): Proposal {
  const o = input.oportunidade
  const cliente = input.clienteNome
  const saudacao = `Olá, pessoal da ${cliente}.`
  if (o.tipo === "aprovacao") {
    return {
      titulo: `Lembrete de aprovação para ${cliente}`,
      resumo: resumoDaOportunidade(input),
      texto: `${saudacao}\n\nA entrega "${input.tituloAcao ?? "pendente"}" está aguardando a aprovação de vocês há ${formatarDias(o.diasParado ?? 0)}, e nosso limite de espera é de ${DIAS_APROVACAO_TRAVADA} dias. Se faltar alguma informação para aprovar, é só nos dizer que a gente ajusta.\n\n${PERGUNTA_APROVACAO}`,
      setorSugerido: input.setor,
      aviso: AVISO_RASCUNHO,
      geradoPor: "simulado",
    }
  }
  const modelo = MODELOS[o.frenteId] ?? MODELO_PADRAO
  const abertura = o.nunca
    ? `Na frente de ${input.frenteNome} ainda não temos nenhuma ação registrada, e o prazo de referência é de ${o.prazoDias} dias.`
    : `Na frente de ${input.frenteNome}, a última ação concluída foi há ${diasExtenso(o.diasParado ?? 0)}, e o prazo de referência é de ${o.prazoDias} dias.`
  return {
    titulo: `Proposta para ${cliente}`,
    resumo: resumoDaOportunidade(input),
    texto: `${saudacao}\n\n${abertura} ${modelo.corpo}\n\n${modelo.pergunta}`,
    setorSugerido: input.setor,
    aviso: AVISO_RASCUNHO,
    geradoPor: "simulado",
  }
}

export const geradorSimulado: ProposalGenerator = {
  async gerar(input) {
    // Espera curta só para exercitar o estado "gerando" da interface.
    await new Promise((r) => setTimeout(r, 350))
    return montar(input)
  },
}

/** Ponto único de troca (Sprint 3: implementação com Claude). */
export const proposalGenerator: ProposalGenerator = geradorSimulado

/** Versão síncrona, usada nos testes e na nota do cartão. */
export const gerarRascunhoSincrono = montar
