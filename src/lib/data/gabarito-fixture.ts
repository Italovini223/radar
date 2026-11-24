import { addDays, parseISO } from "date-fns"

import { toISODate } from "../domain/rules"
import {
  CONFIGURACAO_PADRAO,
  type Acao,
  type Checkup,
  type Client,
  type Contrato,
  type Frente,
  type RadarSnapshot,
  type StatusAcao,
} from "../domain/types"

/**
 * FIXTURE SINTÉTICA pequena, só para TESTES UNITÁRIOS (nenhuma tela ou rota a
 * usa). O dataset de demonstração real é a planilha (`planilha-dataset.ts`,
 * 10 clientes, 8 frentes, 172 tarefas), carregada por `buildSeed()`.
 *
 * Aqui os fatos principais do gabarito são reproduzidos com poucas ações e
 * ids estáveis (`seed-...`), "hoje" = 2026-11-13, para testes rápidos e
 * independentes do dataset real. Diferenças conhecidas em relação à
 * planilha: sem CRO na Aurora e squads preenchidos por cliente.
 *
 * Situações esperadas (testadas em gabarito.test.ts):
 *   Aurora, Ninho, Raiz = crítico; Patas, Vitta, Bella = atenção;
 *   TechMania, Doce Lar, Mundo Kids, Lumi = ok.
 */
export const DATA_REFERENCIA_GABARITO = CONFIGURACAO_PADRAO.dataReferencia

const REF = parseISO(DATA_REFERENCIA_GABARITO)
const diasAtras = (dias: number) => toISODate(addDays(REF, -dias))

export const FRENTES_GABARITO: Frente[] = [
  { id: "google-ads", nome: "Google Ads", setor: "Mídia paga", prazoDias: 30, criticoAposDias: 60 },
  { id: "meta-ads", nome: "Meta Ads", setor: "Mídia paga", prazoDias: 15, criticoAposDias: 30 },
  { id: "crm", nome: "CRM / Automações", setor: "CRM & Automação", prazoDias: 60, criticoAposDias: 120 },
  { id: "conteudo", nome: "Social / Conteúdo", setor: "Conteúdo", prazoDias: 14, criticoAposDias: 28 },
  { id: "materiais", nome: "Produção de materiais", setor: "Materiais", prazoDias: 30, criticoAposDias: 60 },
  { id: "redacao", nome: "Redação", setor: "Redação", prazoDias: 30, criticoAposDias: 60 },
  {
    id: "desenvolvimento",
    nome: "Desenvolvimento · loja em criação",
    setor: "Desenvolvimento",
    prazoDias: 30,
    criticoAposDias: 60,
  },
  { id: "cro", nome: "CRO / Melhorias do site", setor: "CRO & UX", prazoDias: 180, criticoAposDias: 360 },
]

export const CLIENTES_GABARITO: Client[] = [
  { id: "aurora-moda", nome: "Aurora Moda", nicho: "Moda", tipo: "operacao", responsavel: "Squad Alfa", ativo: true },
  { id: "ninho-casa-decor", nome: "Ninho Casa & Decor", nicho: "Casa e decoração", tipo: "operacao", responsavel: "Squad Beta", ativo: true },
  { id: "patas-pet-store", nome: "Patas Pet Store", nicho: "Pet", tipo: "operacao", responsavel: "Squad Gama", ativo: true },
  { id: "vitta-suplementos", nome: "Vitta Suplementos", nicho: "Suplementos", tipo: "operacao", responsavel: "Squad Alfa", ativo: true },
  { id: "bella-pele", nome: "Bella Pele Cosméticos", nicho: "Cosméticos", tipo: "operacao", responsavel: "Squad Beta", ativo: true },
  { id: "techmania", nome: "TechMania", nicho: "Eletrônicos", tipo: "operacao", responsavel: "Squad Gama", ativo: true },
  { id: "doce-lar", nome: "Doce Lar Utilidades", nicho: "Utilidades domésticas", tipo: "operacao", responsavel: "Squad Alfa", ativo: true },
  { id: "mundo-kids", nome: "Mundo Kids Brinquedos", nicho: "Brinquedos", tipo: "operacao", responsavel: "Squad Beta", ativo: true },
  { id: "raiz-organicos", nome: "Raiz Orgânicos", nicho: "Alimentos orgânicos", tipo: "loja_em_criacao", responsavel: "Squad Gama", ativo: true },
  { id: "lumi-acessorios", nome: "Lumi Acessórios", nicho: "Acessórios", tipo: "loja_em_criacao", responsavel: "Squad Alfa", ativo: true },
]

/**
 * Dias atrás (mais recente primeiro) das ações CONCLUÍDAS, por cliente x
 * frente. As chaves definem também as frentes contratadas de cada cliente.
 */
const CONCLUIDAS: Record<string, Record<string, number[]>> = {
  // Google Ads 69 d (crítica), CRM 85 d (atrasada), Meta com 2 itens travados.
  "aurora-moda": {
    "google-ads": [69, 100],
    "meta-ads": [10, 40],
    crm: [85, 140],
    conteudo: [6, 20],
  },
  // CRM 156 d (crítica) e CRO ~389 d (~13 meses, crítica).
  "ninho-casa-decor": {
    "google-ads": [20, 50],
    crm: [156, 220],
    cro: [389, 600],
    conteudo: [5, 18],
  },
  // Google Ads 54 d (atrasada); 1 item aguardando há 4 d NÃO alerta.
  "patas-pet-store": {
    "google-ads": [54, 90],
    "meta-ads": [8, 20],
    crm: [30, 70],
    conteudo: [5, 12],
    materiais: [12, 40],
  },
  // Social 24 d com prazo 14 (atrasada).
  "vitta-suplementos": {
    "google-ads": [15, 40],
    "meta-ads": [6, 20],
    crm: [20, 60],
    conteudo: [24, 50],
  },
  // 3 peças de Black Friday aguardando há 6 d (travada).
  "bella-pele": {
    "google-ads": [12, 40],
    "meta-ads": [7, 20],
    materiais: [10, 35],
    redacao: [15, 40],
  },
  // Controle: tudo dentro do prazo.
  techmania: {
    "google-ads": [10, 35],
    "meta-ads": [5, 18],
    crm: [20, 70],
    conteudo: [6, 18],
    redacao: [12, 40],
    cro: [90, 300],
  },
  // Controle: tudo dentro do prazo.
  "doce-lar": {
    "google-ads": [12, 38],
    "meta-ads": [4, 17],
    crm: [25, 80],
    conteudo: [8, 20],
    materiais: [10, 36],
  },
  // Perto do prazo (Redação 27/30, CRO ~165/180): só avisos, sem alerta.
  "mundo-kids": {
    "google-ads": [10, 38],
    "meta-ads": [6, 19],
    conteudo: [5, 18],
    redacao: [27, 60],
    cro: [165, 350],
  },
  // Loja em criação: layout aguardando o cliente há 66 d, 2 follow-ups
  // concluídos sem resposta (não reiniciam o relógio).
  "raiz-organicos": {
    desenvolvimento: [40, 12, 95],
  },
  // Loja em criação saudável: item aguardando há 1 d.
  "lumi-acessorios": {
    desenvolvimento: [30],
  },
}

const TITULOS: Record<string, string[]> = {
  "google-ads": ["Revisão de campanhas de busca", "Ajuste de lances e palavras negativas"],
  "meta-ads": ["Renovação de criativos de remarketing", "Teste de público semelhante"],
  crm: ["Régua de pós-compra revisada", "Segmentação de clientes inativos"],
  conteudo: ["Calendário editorial do mês", "Pauta de posts e reels"],
  materiais: ["Kit de peças para campanha", "Banners promocionais"],
  redacao: ["Copy das páginas de categoria", "Textos de e-mail marketing"],
  cro: ["Teste A/B na página de produto", "Revisão do checkout"],
  desenvolvimento: ["Estrutura e briefing da loja", "Configuração do tema"],
}

interface Aguardando {
  clientId: string
  frenteId: string
  titulos: string[]
  /** Há quantos dias aguarda. */
  dias: number
}

const AGUARDANDO: Aguardando[] = [
  {
    clientId: "aurora-moda",
    frenteId: "meta-ads",
    titulos: ["Criativos de remarketing (lote 1)", "Criativos de remarketing (lote 2)"],
    dias: 9,
  },
  {
    clientId: "patas-pet-store",
    frenteId: "materiais",
    titulos: ["Banner da campanha de ração"],
    dias: 4,
  },
  {
    clientId: "bella-pele",
    frenteId: "materiais",
    titulos: [
      "Peça de Black Friday: banner principal",
      "Peça de Black Friday: stories",
      "Peça de Black Friday: e-mail marketing",
    ],
    dias: 6,
  },
  {
    clientId: "mundo-kids",
    frenteId: "redacao",
    titulos: ["Descrições da linha de lançamentos"],
    dias: 1,
  },
  {
    clientId: "raiz-organicos",
    frenteId: "desenvolvimento",
    titulos: ["Layout da loja (home e produto): aguardando o cliente"],
    dias: 66,
  },
  {
    clientId: "lumi-acessorios",
    frenteId: "desenvolvimento",
    titulos: ["Layout da home: aguardando o cliente"],
    dias: 1,
  },
]

// Na ordem de CONCLUIDAS.desenvolvimento: o mais recente (12 d) é o 2º follow-up.
const TITULOS_RAIZ_FOLLOWUP = [
  "Follow-up ao cliente: layout sem resposta (1º)",
  "Follow-up ao cliente: layout sem resposta (2º)",
]

/** Frentes contratadas: derivadas das chaves de `CONCLUIDAS`. */
export function contratosGabarito(): Contrato[] {
  return Object.entries(CONCLUIDAS).flatMap(([clientId, porFrente]) =>
    Object.keys(porFrente).map((frenteId) => ({ clientId, frenteId }))
  )
}

export function montarGabarito(): RadarSnapshot {
  const responsavel = new Map(CLIENTES_GABARITO.map((c) => [c.id, c.responsavel]))
  const acoes: Acao[] = []

  for (const [clientId, porFrente] of Object.entries(CONCLUIDAS)) {
    for (const [frenteId, dias] of Object.entries(porFrente)) {
      const titulos = TITULOS[frenteId]
      dias.forEach((d, i) => {
        const data = diasAtras(d)
        const followUp =
          clientId === "raiz-organicos" && i < TITULOS_RAIZ_FOLLOWUP.length
        acoes.push({
          id: `seed-${clientId}-${frenteId}-${i}`,
          clientId,
          frenteId,
          titulo: followUp
            ? TITULOS_RAIZ_FOLLOWUP[i]
            : titulos[i % titulos.length],
          data,
          status: "concluida",
          origem: "seed",
          responsavel: responsavel.get(clientId),
          criadaEm: data,
          concluidaEm: data,
        })
      })
    }
  }

  for (const g of AGUARDANDO) {
    const data = diasAtras(g.dias)
    g.titulos.forEach((titulo, i) => {
      acoes.push({
        id: `seed-${g.clientId}-${g.frenteId}-aguardando-${i}`,
        clientId: g.clientId,
        frenteId: g.frenteId,
        titulo,
        data,
        status: "aguardando_aprovacao" satisfies StatusAcao,
        aguardandoDesde: data,
        origem: "seed",
        responsavel: responsavel.get(g.clientId),
        criadaEm: data,
      })
    })
  }

  // Em andamento: não conta como ação concluída.
  acoes.push({
    id: "seed-doce-lar-crm-andamento",
    clientId: "doce-lar",
    frenteId: "crm",
    titulo: "Fluxo de carrinho abandonado",
    data: diasAtras(2),
    status: "em_andamento",
    origem: "seed",
    responsavel: "Squad Alfa",
    criadaEm: diasAtras(2),
  })

  const checkups: Checkup[] = [
    {
      id: "seed-checkup-techmania",
      clientId: "techmania",
      data: diasAtras(5),
      resultadoAds: "estavel",
    },
  ]

  return {
    clients: CLIENTES_GABARITO.map((c) => ({ ...c })),
    frentes: FRENTES_GABARITO.map((f) => ({ ...f })),
    contratos: contratosGabarito(),
    acoes,
    checkups,
    atribuicoes: [],
    configuracao: { ...CONFIGURACAO_PADRAO },
  }
}
