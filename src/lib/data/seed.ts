import { addDays, parseISO } from "date-fns"

import { toISODate } from "../domain/rules"
import type {
  Acao,
  Client,
  Frente,
  RadarSnapshot,
  StatusAcao,
} from "../domain/types"

/**
 * Dados 100% fictícios (nenhum cliente real, nenhum dado financeiro).
 * Os gargalos plantados abaixo são o ORÁCULO dos testes (rules.test.ts).
 * As datas são relativas a `now`, então o demo sempre mostra os mesmos alertas.
 *
 * Prazos por frente: iniciais, "a validar com os setores".
 */
export const FRENTES_SEED: Frente[] = [
  { id: "google-ads", nome: "Google Ads", setor: "Mídia paga", prazoDias: 30 },
  { id: "meta-ads", nome: "Meta Ads", setor: "Mídia paga", prazoDias: 30 },
  { id: "crm", nome: "CRM", setor: "CRM & Automação", prazoDias: 15 },
  { id: "cro", nome: "CRO", setor: "CRO & UX", prazoDias: 180 },
  { id: "layout", nome: "Layout", setor: "CRO & UX", prazoDias: 365 },
  {
    id: "conteudo",
    nome: "Conteúdo/Social",
    setor: "Conteúdo",
    prazoDias: 30,
  },
  { id: "materiais", nome: "Materiais", setor: "Materiais", prazoDias: 30 },
  { id: "redacao", nome: "Redação", setor: "Redação", prazoDias: 30 },
]

export const CLIENTS_SEED: Client[] = [
  {
    id: "flor-de-sal",
    nome: "Flor de Sal",
    segmento: "Moda e acessórios",
    responsavel: "Squad Alfa",
    ativo: true,
  },
  {
    id: "casa-nativa",
    nome: "Casa Nativa",
    segmento: "Casa e decoração",
    responsavel: "Squad Beta",
    ativo: true,
  },
  {
    id: "velo-bikes",
    nome: "Velô Bikes",
    segmento: "Ciclismo",
    responsavel: "Squad Alfa",
    ativo: true,
  },
  {
    id: "nossa-horta",
    nome: "Nossa Horta",
    segmento: "Alimentos orgânicos",
    responsavel: "Squad Gama",
    ativo: true,
  },
  {
    id: "aurora-pet",
    nome: "Aurora Pet",
    segmento: "Produtos para pets",
    responsavel: "Squad Beta",
    ativo: true,
  },
]

const TITULOS: Record<string, string[]> = {
  "google-ads": [
    "Revisão de campanhas de busca",
    "Ajuste de lances e palavras negativas",
    "Novo grupo de anúncios de marca",
  ],
  "meta-ads": [
    "Renovação de criativos de remarketing",
    "Teste de público semelhante",
    "Otimização de campanha de catálogo",
  ],
  crm: [
    "Régua de pós-compra revisada",
    "Disparo de campanha sazonal",
    "Segmentação de clientes inativos",
  ],
  cro: [
    "Teste A/B na página de produto",
    "Revisão do checkout",
    "Mapa de calor da home",
  ],
  layout: [
    "Atualização do layout da loja",
    "Novo banner e vitrine principal",
    "Ajuste de grade de categorias",
  ],
  conteudo: [
    "Calendário editorial do mês",
    "Pauta de posts e artigos",
    "Série de conteúdos sazonais",
  ],
  materiais: [
    "Kit de peças para campanha",
    "Atualização de materiais de vendas",
    "Banners promocionais",
  ],
  redacao: [
    "Copy das páginas de categoria",
    "Revisão de descrições de produto",
    "Textos de e-mail marketing",
  ],
}

/** Dias atrás (mais recente primeiro) das ações concluídas, por cliente x frente. */
type Plano = Record<string, Record<string, number[]>>

const PLANO: Plano = {
  // Gargalo: Google Ads parado há 40 dias (prazo 30) -> atrasada.
  "flor-de-sal": {
    "google-ads": [40, 71, 102],
    "meta-ads": [12, 38],
    crm: [6, 20],
    cro: [90],
    layout: [150],
    conteudo: [15, 44],
    materiais: [20],
    redacao: [9, 35],
  },
  // Gargalo: Layout sem atualização há 2 anos -> crítica.
  "casa-nativa": {
    "google-ads": [10, 41],
    "meta-ads": [18],
    crm: [4, 19],
    cro: [120],
    layout: [730, 1095],
    conteudo: [22],
    materiais: [25],
    redacao: [14, 40],
  },
  // Gargalo: CRM sem nenhuma ação (nunca) -> crítica.
  "velo-bikes": {
    "google-ads": [5, 33],
    "meta-ads": [8, 30],
    cro: [60],
    layout: [200],
    conteudo: [10, 41],
    materiais: [28],
    redacao: [3, 29],
  },
  // Gargalo: Conteúdo parado há 90 dias (prazo 30) -> crítica (> 150%).
  "nossa-horta": {
    "google-ads": [20, 52],
    "meta-ads": [25],
    crm: [5, 18],
    cro: [40],
    layout: [100],
    conteudo: [90, 121, 152],
    materiais: [12],
    redacao: [18, 49],
  },
  // Controle: tudo em dia; só uma ação travada em aprovação (abaixo).
  "aurora-pet": {
    "google-ads": [7, 36],
    "meta-ads": [11],
    crm: [3, 17],
    cro: [30],
    layout: [60],
    conteudo: [8, 39],
    materiais: [15],
    redacao: [12, 44],
  },
}

export function buildSeed(now: Date): RadarSnapshot {
  const dataAtras = (dias: number) => toISODate(addDays(now, -dias))
  const acoes: Acao[] = []

  for (const [clientId, porFrente] of Object.entries(PLANO)) {
    for (const [frenteId, dias] of Object.entries(porFrente)) {
      const titulos = TITULOS[frenteId]
      dias.forEach((d, i) => {
        acoes.push({
          id: `seed-${clientId}-${frenteId}-${i}`,
          clientId,
          frenteId,
          titulo: titulos[i % titulos.length],
          data: dataAtras(d),
          status: "concluida",
          origem: "seed",
        })
      })
    }
  }

  const extra = (
    id: string,
    clientId: string,
    frenteId: string,
    titulo: string,
    diasAtras: number,
    status: StatusAcao
  ): Acao => ({
    id,
    clientId,
    frenteId,
    titulo,
    data: dataAtras(diasAtras),
    status,
    aguardandoDesde:
      status === "aguardando_aprovacao" ? dataAtras(diasAtras) : undefined,
    origem: "seed",
  })

  // Aprovação travada (10 dias > 7): único alerta do cliente de controle.
  acoes.push(
    extra(
      "seed-aurora-pet-redacao-aprov",
      "aurora-pet",
      "redacao",
      "Textos da campanha de Natal",
      10,
      "aguardando_aprovacao"
    )
  )
  // Em andamento (não conta como ação concluída).
  acoes.push(
    extra(
      "seed-casa-nativa-cro-andamento",
      "casa-nativa",
      "cro",
      "Diagnóstico de UX da loja",
      3,
      "em_andamento"
    )
  )
  // Aprovação recente (3 dias, abaixo do limite): não gera alerta.
  acoes.push(
    extra(
      "seed-flor-de-sal-materiais-aprov",
      "flor-de-sal",
      "materiais",
      "Banners da coleção nova",
      3,
      "aguardando_aprovacao"
    )
  )

  return {
    clients: CLIENTS_SEED.map((c) => ({ ...c })),
    frentes: FRENTES_SEED.map((f) => ({ ...f })),
    acoes,
    checkups: [
      {
        id: "seed-checkup-1",
        clientId: "aurora-pet",
        data: dataAtras(5),
        resultadoAds: "estavel",
      },
    ],
    atribuicoes: [],
  }
}

/** Utilitário para testes: interpreta uma data ISO como "hoje". */
export function hojeDe(iso: string): Date {
  return parseISO(iso)
}
