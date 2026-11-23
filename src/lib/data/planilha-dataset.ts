import {
  CONFIGURACAO_PADRAO,
  type Acao,
  type Client,
  type Contrato,
  type Frente,
  type RadarSnapshot,
  type StatusAcao,
} from "../domain/types"

/**
 * DATASET DA PLANILHA "Weethub Radar — Dados fictícios para a demonstração"
 * (abas "Clientes e gargalos", "Prazos por frente" e "Tarefas"), montada pela
 * líder do time. 100% fictício. Data de referência do gabarito: 2026-11-13.
 *
 * Transcrito à mão a partir da planilha aberta no navegador (a exportação em
 * CSV ainda não existia): 10 clientes, 8 frentes e 172 tarefas (T001..T172).
 * Se a planilha for exportada, conferir este arquivo contra o CSV.
 *
 * Frentes contratadas = frentes que o cliente tem pelo menos uma tarefa
 * (Raiz e Lumi só têm Desenvolvimento; Patas, Vitta e Bella não têm CRO).
 */
export const DATA_REFERENCIA_PLANILHA = "2026-11-13"
export const TOTAL_TAREFAS_PLANILHA = 172

export const FRENTES_PLANILHA: Frente[] = [
  { id: "google-ads", nome: "Google Ads", setor: "Mídia paga", prazoDias: 30, criticoAposDias: 60 },
  { id: "meta-ads", nome: "Meta Ads", setor: "Mídia paga", prazoDias: 15, criticoAposDias: 30 },
  { id: "crm", nome: "CRM / Automações", setor: "CRM & Automação", prazoDias: 60, criticoAposDias: 120 },
  { id: "conteudo", nome: "Social / Conteúdo", setor: "Conteúdo", prazoDias: 14, criticoAposDias: 28 },
  { id: "materiais", nome: "Produção de materiais", setor: "Materiais", prazoDias: 30, criticoAposDias: 60 },
  { id: "redacao", nome: "Redação", setor: "Redação", prazoDias: 30, criticoAposDias: 60 },
  {
    id: "desenvolvimento",
    nome: "Desenvolvimento · loja em criação (cliente sem retorno)",
    setor: "Desenvolvimento",
    prazoDias: 30,
    criticoAposDias: 60,
  },
  { id: "cro", nome: "CRO / Melhorias do site", setor: "CRO & UX", prazoDias: 180, criticoAposDias: 360 },
]

/** O responsável por cliente não existe na planilha (só por tarefa). */
export const CLIENTES_PLANILHA: Client[] = [
  { id: "aurora-moda", nome: "Aurora Moda", nicho: "Moda feminina", tipo: "operacao", responsavel: "", ativo: true },
  { id: "ninho-casa-decor", nome: "Ninho Casa & Decor", nicho: "Casa e decoração", tipo: "operacao", responsavel: "", ativo: true },
  { id: "patas-pet-store", nome: "Patas Pet Store", nicho: "Pet shop", tipo: "operacao", responsavel: "", ativo: true },
  { id: "vitta-suplementos", nome: "Vitta Suplementos", nicho: "Suplementos", tipo: "operacao", responsavel: "", ativo: true },
  { id: "bella-pele", nome: "Bella Pele Cosméticos", nicho: "Cosméticos", tipo: "operacao", responsavel: "", ativo: true },
  { id: "techmania", nome: "TechMania", nicho: "Eletrônicos", tipo: "operacao", responsavel: "", ativo: true },
  { id: "doce-lar", nome: "Doce Lar Utilidades", nicho: "Utilidades domésticas", tipo: "operacao", responsavel: "", ativo: true },
  { id: "mundo-kids", nome: "Mundo Kids Brinquedos", nicho: "Brinquedos", tipo: "operacao", responsavel: "", ativo: true },
  { id: "raiz-organicos", nome: "Raiz Orgânicos", nicho: "Alimentos orgânicos", tipo: "loja_em_criacao", responsavel: "", ativo: true },
  { id: "lumi-acessorios", nome: "Lumi Acessórios", nicho: "Acessórios", tipo: "loja_em_criacao", responsavel: "", ativo: true },
]

/** Gabarito da aba "Clientes e gargalos" (situação esperada em 2026-11-13). */
export const GABARITO_PLANILHA: Record<
  string,
  { situacao: "critico" | "atencao" | "ok"; apontar: string }
> = {
  "aurora-moda": {
    situacao: "critico",
    apontar:
      "Google Ads sem ação há 69 dias (prazo 30); CRM sem ação há 85 dias (prazo 60); 2 itens de Meta Ads aguardando aprovação há 9 dias (limite 5); última análise de CRO há 19 meses (prazo 6)",
  },
  "ninho-casa-decor": {
    situacao: "critico",
    apontar:
      "CRM sem nenhuma automação há 156 dias (mais de 2x o prazo de 60); último ajuste de site/CRO há 13 meses (prazo 6)",
  },
  "patas-pet-store": {
    situacao: "atencao",
    apontar:
      "20 tarefas concluídas nos últimos 30 dias, nenhuma de Google Ads; última ação em Google Ads há 54 dias (prazo 30). 1 item aguardando aprovação há 4 dias (ainda dentro do limite)",
  },
  "vitta-suplementos": {
    situacao: "atencao",
    apontar: "Social / Conteúdo sem ação há 24 dias (prazo 14)",
  },
  "bella-pele": {
    situacao: "atencao",
    apontar: "3 peças de Black Friday aguardando aprovação há 6 dias (limite 5)",
  },
  techmania: {
    situacao: "ok",
    apontar: "Nenhum alerta: todas as frentes dentro do prazo",
  },
  "doce-lar": {
    situacao: "ok",
    apontar: "Nenhum alerta: todas as frentes dentro do prazo",
  },
  "mundo-kids": {
    situacao: "ok",
    apontar:
      "Redação há 27 dias (prazo 30) e CRO há cerca de 5,5 meses (prazo 6): no máximo avisos de perto do prazo. 1 item aguardando há 1 dia: não deve alertar",
  },
  "raiz-organicos": {
    situacao: "critico",
    apontar:
      "Layout da home aguardando o cliente há 66 dias (crítico após 60). Faltam 24 dias para o bloqueio contratual de 90 dias. A Gestão de Projetos fez 2 follow-ups sem resposta, e nenhuma outra providência foi tomada",
  },
  "lumi-acessorios": {
    situacao: "ok",
    apontar:
      "Nenhum alerta: aprovações em dia e projeto andando. 1 item aguardando há 1 dia: não deve alertar",
  },
}

const CRM = "CRM · Bruno"
const GADS = "Tráfego · Lucas"
const META = "Tráfego · Marina"
const MAT = "Design · Rafa"
const RED = "Redação · Júlia"
const SOC = "Social · Carla"
const DEV = "Gestão de Projetos · Diego"
const WEB = "Web design · Téo"

type S = "C" | "E" | "A"
/** [id, cliente, frente, título, status, responsável, criada, concluída, aguardando desde] */
type Linha = readonly [
  string, string, string, string, S, string, string, string, string,
]

const T: readonly Linha[] = [
  // Aurora Moda
  ["T001", "aurora-moda", "crm", "Segmentação de base", "C", CRM, "2026-06-19", "2026-06-21", ""],
  ["T002", "aurora-moda", "crm", "Segmentação de base", "C", CRM, "2026-07-15", "2026-07-18", ""],
  ["T003", "aurora-moda", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-08-14", "2026-08-20", ""],
  ["T004", "aurora-moda", "google-ads", "Revisão de palavras-chave negativas", "C", GADS, "2026-08-03", "2026-08-05", ""],
  ["T005", "aurora-moda", "google-ads", "Campanha de remarketing", "C", GADS, "2026-08-17", "2026-08-19", ""],
  ["T006", "aurora-moda", "google-ads", "Otimização de campanha de Shopping", "C", GADS, "2026-08-31", "2026-09-05", ""],
  ["T007", "aurora-moda", "meta-ads", "Troca de criativos", "C", META, "2026-10-26", "2026-10-29", ""],
  ["T008", "aurora-moda", "meta-ads", "Troca de criativos", "C", META, "2026-10-30", "2026-11-04", ""],
  ["T009", "aurora-moda", "meta-ads", "Teste A/B de criativos", "C", META, "2026-11-10", "2026-11-12", ""],
  ["T010", "aurora-moda", "meta-ads", "Criativos da campanha de fim de ano", "A", META, "2026-11-01", "", "2026-11-04"],
  ["T011", "aurora-moda", "meta-ads", "Vídeo de lançamento da coleção", "A", META, "2026-11-01", "", "2026-11-04"],
  ["T012", "aurora-moda", "materiais", "Banner de categoria", "C", MAT, "2026-09-28", "2026-10-04", ""],
  ["T013", "aurora-moda", "materiais", "Banner de categoria", "C", MAT, "2026-10-14", "2026-10-18", ""],
  ["T014", "aurora-moda", "materiais", "Artes para campanha", "C", MAT, "2026-10-28", "2026-11-03", ""],
  ["T015", "aurora-moda", "redacao", "Texto de landing page", "C", RED, "2026-10-03", "2026-10-09", ""],
  ["T016", "aurora-moda", "redacao", "Texto de landing page", "C", RED, "2026-10-22", "2026-10-26", ""],
  ["T017", "aurora-moda", "redacao", "Texto de landing page", "C", RED, "2026-11-05", "2026-11-11", ""],
  ["T018", "aurora-moda", "conteudo", "Calendário de conteúdo do mês", "C", SOC, "2026-10-19", "2026-10-22", ""],
  ["T019", "aurora-moda", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-26", "2026-10-30", ""],
  ["T020", "aurora-moda", "conteudo", "Posts da semana", "C", SOC, "2026-11-04", "2026-11-06", ""],
  // Bella Pele Cosméticos
  ["T021", "bella-pele", "crm", "Régua de pós-compra", "C", CRM, "2026-09-08", "2026-09-12", ""],
  ["T022", "bella-pele", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-10-10", "2026-10-13", ""],
  ["T023", "bella-pele", "crm", "Régua de pós-compra", "C", CRM, "2026-11-07", "2026-11-12", ""],
  ["T024", "bella-pele", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-09-26", "2026-09-28", ""],
  ["T025", "bella-pele", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-10-10", "2026-10-13", ""],
  ["T026", "bella-pele", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-10-29", "2026-10-31", ""],
  ["T027", "bella-pele", "meta-ads", "Troca de criativos", "C", META, "2026-10-16", "2026-10-19", ""],
  ["T028", "bella-pele", "meta-ads", "Campanha de catálogo", "C", META, "2026-10-22", "2026-10-28", ""],
  ["T029", "bella-pele", "meta-ads", "Ajuste de público", "C", META, "2026-11-01", "2026-11-05", ""],
  ["T030", "bella-pele", "materiais", "Artes para campanha", "C", MAT, "2026-09-21", "2026-09-26", ""],
  ["T031", "bella-pele", "materiais", "Banner de categoria", "C", MAT, "2026-10-03", "2026-10-09", ""],
  ["T032", "bella-pele", "materiais", "Artes para campanha", "C", MAT, "2026-10-21", "2026-10-27", ""],
  ["T033", "bella-pele", "materiais", "Artes da Black Friday", "A", MAT, "2026-11-03", "", "2026-11-07"],
  ["T034", "bella-pele", "materiais", "Banner da home", "A", MAT, "2026-11-03", "", "2026-11-07"],
  ["T035", "bella-pele", "materiais", "Peças para e-mail de Black Friday", "A", MAT, "2026-11-03", "", "2026-11-07"],
  ["T036", "bella-pele", "redacao", "Descrições de produto", "C", RED, "2026-10-06", "2026-10-12", ""],
  ["T037", "bella-pele", "redacao", "Descrições de produto", "C", RED, "2026-10-21", "2026-10-27", ""],
  ["T038", "bella-pele", "redacao", "Texto de landing page", "C", RED, "2026-11-09", "2026-11-12", ""],
  ["T039", "bella-pele", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-19", "2026-10-23", ""],
  ["T040", "bella-pele", "conteudo", "Calendário de conteúdo do mês", "C", SOC, "2026-10-28", "2026-10-31", ""],
  ["T041", "bella-pele", "conteudo", "Stories de lançamento", "C", SOC, "2026-11-04", "2026-11-08", ""],
  // Doce Lar Utilidades
  ["T042", "doce-lar", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-08-16", "2026-08-18", ""],
  ["T043", "doce-lar", "crm", "Régua de pós-compra", "C", CRM, "2026-09-15", "2026-09-17", ""],
  ["T044", "doce-lar", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-10-13", "2026-10-19", ""],
  ["T045", "doce-lar", "google-ads", "Revisão de palavras-chave negativas", "C", GADS, "2026-09-30", "2026-10-03", ""],
  ["T046", "doce-lar", "google-ads", "Ajuste de lances por categoria", "C", GADS, "2026-10-16", "2026-10-20", ""],
  ["T047", "doce-lar", "google-ads", "Ajuste de lances por categoria", "C", GADS, "2026-10-30", "2026-11-05", ""],
  ["T048", "doce-lar", "meta-ads", "Troca de criativos", "C", META, "2026-10-17", "2026-10-22", ""],
  ["T049", "doce-lar", "meta-ads", "Teste A/B de criativos", "C", META, "2026-10-25", "2026-10-31", ""],
  ["T050", "doce-lar", "meta-ads", "Nova campanha de conversão", "C", META, "2026-11-05", "2026-11-07", ""],
  ["T051", "doce-lar", "materiais", "Banner de categoria", "C", MAT, "2026-10-02", "2026-10-07", ""],
  ["T052", "doce-lar", "materiais", "Artes para campanha", "C", MAT, "2026-10-19", "2026-10-21", ""],
  ["T053", "doce-lar", "materiais", "Peças para e-mail", "C", MAT, "2026-11-06", "2026-11-08", ""],
  ["T054", "doce-lar", "redacao", "Legendas do mês", "C", RED, "2026-10-03", "2026-10-05", ""],
  ["T055", "doce-lar", "redacao", "Textos de e-mail", "C", RED, "2026-10-14", "2026-10-20", ""],
  ["T056", "doce-lar", "redacao", "Descrições de produto", "C", RED, "2026-10-31", "2026-11-04", ""],
  ["T057", "doce-lar", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-21", "2026-10-25", ""],
  ["T058", "doce-lar", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-27", "2026-10-30", ""],
  ["T059", "doce-lar", "conteudo", "Roteiro de reels", "C", SOC, "2026-11-05", "2026-11-08", ""],
  ["T060", "doce-lar", "conteudo", "Roteiro de reels", "E", SOC, "2026-11-11", "", ""],
  // Mundo Kids Brinquedos
  ["T061", "mundo-kids", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-08-19", "2026-08-23", ""],
  ["T062", "mundo-kids", "crm", "Campanha de e-mail promocional", "C", CRM, "2026-09-20", "2026-09-23", ""],
  ["T063", "mundo-kids", "crm", "Segmentação de base", "C", CRM, "2026-10-19", "2026-10-24", ""],
  ["T064", "mundo-kids", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-10-04", "2026-10-10", ""],
  ["T065", "mundo-kids", "google-ads", "Revisão de palavras-chave negativas", "C", GADS, "2026-10-17", "2026-10-22", ""],
  ["T066", "mundo-kids", "google-ads", "Campanha de remarketing", "C", GADS, "2026-11-05", "2026-11-09", ""],
  ["T067", "mundo-kids", "meta-ads", "Nova campanha de conversão", "C", META, "2026-10-26", "2026-10-29", ""],
  ["T068", "mundo-kids", "meta-ads", "Ajuste de público", "C", META, "2026-11-02", "2026-11-04", ""],
  ["T069", "mundo-kids", "meta-ads", "Nova campanha de conversão", "C", META, "2026-11-09", "2026-11-12", ""],
  ["T070", "mundo-kids", "materiais", "Artes para campanha", "C", MAT, "2026-10-04", "2026-10-07", ""],
  ["T071", "mundo-kids", "materiais", "Peças para e-mail", "C", MAT, "2026-10-16", "2026-10-22", ""],
  ["T072", "mundo-kids", "materiais", "Vídeo curto de produto", "C", MAT, "2026-11-03", "2026-11-09", ""],
  ["T073", "mundo-kids", "materiais", "Artes de Natal", "A", MAT, "2026-11-10", "", "2026-11-12"],
  ["T074", "mundo-kids", "redacao", "Descrições de produto", "C", RED, "2026-09-13", "2026-09-16", ""],
  ["T075", "mundo-kids", "redacao", "Descrições de produto", "C", RED, "2026-09-26", "2026-09-30", ""],
  ["T076", "mundo-kids", "redacao", "Texto de landing page", "C", RED, "2026-10-14", "2026-10-17", ""],
  ["T077", "mundo-kids", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-22", "2026-10-25", ""],
  ["T078", "mundo-kids", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-26", "2026-11-01", ""],
  ["T079", "mundo-kids", "conteudo", "Posts da semana", "C", SOC, "2026-11-06", "2026-11-08", ""],
  // Ninho Casa & Decor
  ["T080", "ninho-casa-decor", "crm", "Segmentação de base", "C", CRM, "2026-04-07", "2026-04-09", ""],
  ["T081", "ninho-casa-decor", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-05-05", "2026-05-10", ""],
  ["T082", "ninho-casa-decor", "crm", "Revisão da régua de boas-vindas", "C", CRM, "2026-06-07", "2026-06-10", ""],
  ["T083", "ninho-casa-decor", "google-ads", "Campanha de remarketing", "C", GADS, "2026-09-27", "2026-10-01", ""],
  ["T084", "ninho-casa-decor", "google-ads", "Campanha de remarketing", "C", GADS, "2026-10-13", "2026-10-15", ""],
  ["T085", "ninho-casa-decor", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-10-29", "2026-11-01", ""],
  ["T086", "ninho-casa-decor", "meta-ads", "Teste A/B de criativos", "C", META, "2026-10-13", "2026-10-19", ""],
  ["T087", "ninho-casa-decor", "meta-ads", "Troca de criativos", "C", META, "2026-10-25", "2026-10-27", ""],
  ["T088", "ninho-casa-decor", "meta-ads", "Campanha de catálogo", "C", META, "2026-11-01", "2026-11-05", ""],
  ["T089", "ninho-casa-decor", "materiais", "Vídeo curto de produto", "C", MAT, "2026-10-01", "2026-10-05", ""],
  ["T090", "ninho-casa-decor", "materiais", "Vídeo curto de produto", "C", MAT, "2026-10-11", "2026-10-17", ""],
  ["T091", "ninho-casa-decor", "materiais", "Peças para e-mail", "C", MAT, "2026-11-02", "2026-11-04", ""],
  ["T092", "ninho-casa-decor", "redacao", "Descrições de produto", "C", RED, "2026-09-24", "2026-09-29", ""],
  ["T093", "ninho-casa-decor", "redacao", "Descrições de produto", "C", RED, "2026-10-11", "2026-10-17", ""],
  ["T094", "ninho-casa-decor", "redacao", "Textos de e-mail", "C", RED, "2026-10-28", "2026-11-01", ""],
  ["T095", "ninho-casa-decor", "conteudo", "Calendário de conteúdo do mês", "C", SOC, "2026-10-20", "2026-10-22", ""],
  ["T096", "ninho-casa-decor", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-23", "2026-10-29", ""],
  ["T097", "ninho-casa-decor", "conteudo", "Stories de lançamento", "C", SOC, "2026-11-01", "2026-11-07", ""],
  // Patas Pet Store
  ["T098", "patas-pet-store", "crm", "Campanha de e-mail promocional", "C", CRM, "2026-10-14", "2026-10-17", ""],
  ["T099", "patas-pet-store", "crm", "Campanha de e-mail promocional", "C", CRM, "2026-10-11", "2026-10-17", ""],
  ["T100", "patas-pet-store", "crm", "Revisão da régua de boas-vindas", "C", CRM, "2026-10-22", "2026-10-25", ""],
  ["T101", "patas-pet-store", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-10-24", "2026-10-28", ""],
  ["T102", "patas-pet-store", "google-ads", "Ajuste de lances por categoria", "C", GADS, "2026-09-01", "2026-09-04", ""],
  ["T103", "patas-pet-store", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-09-16", "2026-09-20", ""],
  ["T104", "patas-pet-store", "meta-ads", "Campanha de catálogo", "C", META, "2026-10-21", "2026-10-26", ""],
  ["T105", "patas-pet-store", "meta-ads", "Ajuste de público", "C", META, "2026-10-23", "2026-10-26", ""],
  ["T106", "patas-pet-store", "meta-ads", "Teste A/B de criativos", "C", META, "2026-10-27", "2026-10-31", ""],
  ["T107", "patas-pet-store", "meta-ads", "Teste A/B de criativos", "C", META, "2026-10-31", "2026-11-04", ""],
  ["T108", "patas-pet-store", "meta-ads", "Criativos da campanha de verão", "A", META, "2026-11-06", "", "2026-11-09"],
  ["T109", "patas-pet-store", "materiais", "Banner de categoria", "C", MAT, "2026-10-22", "2026-10-24", ""],
  ["T110", "patas-pet-store", "materiais", "Peças para e-mail", "C", MAT, "2026-10-20", "2026-10-24", ""],
  ["T111", "patas-pet-store", "materiais", "Peças para e-mail", "C", MAT, "2026-10-23", "2026-10-26", ""],
  ["T112", "patas-pet-store", "materiais", "Vídeo curto de produto", "C", MAT, "2026-10-29", "2026-11-01", ""],
  ["T113", "patas-pet-store", "redacao", "Legendas do mês", "C", RED, "2026-10-26", "2026-10-28", ""],
  ["T114", "patas-pet-store", "redacao", "Legendas do mês", "C", RED, "2026-10-25", "2026-10-28", ""],
  ["T115", "patas-pet-store", "redacao", "Descrições de produto", "C", RED, "2026-10-31", "2026-11-03", ""],
  ["T116", "patas-pet-store", "redacao", "Texto de landing page", "C", RED, "2026-11-04", "2026-11-08", ""],
  ["T117", "patas-pet-store", "conteudo", "Calendário de conteúdo do mês", "C", SOC, "2026-10-18", "2026-10-23", ""],
  ["T118", "patas-pet-store", "conteudo", "Calendário de conteúdo do mês", "C", SOC, "2026-10-20", "2026-10-23", ""],
  ["T119", "patas-pet-store", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-25", "2026-10-28", ""],
  ["T120", "patas-pet-store", "conteudo", "Calendário de conteúdo do mês", "C", SOC, "2026-10-28", "2026-10-31", ""],
  // TechMania
  ["T121", "techmania", "crm", "Régua de pós-compra", "C", CRM, "2026-08-04", "2026-08-10", ""],
  ["T122", "techmania", "crm", "Revisão da régua de boas-vindas", "C", CRM, "2026-09-04", "2026-09-10", ""],
  ["T123", "techmania", "crm", "Segmentação de base", "C", CRM, "2026-10-06", "2026-10-11", ""],
  ["T124", "techmania", "google-ads", "Otimização de campanha de Shopping", "C", GADS, "2026-09-29", "2026-10-03", ""],
  ["T125", "techmania", "google-ads", "Nova campanha Performance Max", "C", GADS, "2026-10-12", "2026-10-15", ""],
  ["T126", "techmania", "google-ads", "Otimização de campanha de Shopping", "C", GADS, "2026-10-27", "2026-11-02", ""],
  ["T127", "techmania", "meta-ads", "Campanha de catálogo", "C", META, "2026-10-22", "2026-10-28", ""],
  ["T128", "techmania", "meta-ads", "Campanha de catálogo", "C", META, "2026-10-28", "2026-11-01", ""],
  ["T129", "techmania", "meta-ads", "Teste A/B de criativos", "C", META, "2026-11-09", "2026-11-11", ""],
  ["T130", "techmania", "materiais", "Peças para e-mail", "C", MAT, "2026-10-05", "2026-10-08", ""],
  ["T131", "techmania", "materiais", "Banner de categoria", "C", MAT, "2026-10-21", "2026-10-25", ""],
  ["T132", "techmania", "materiais", "Artes para campanha", "C", MAT, "2026-11-08", "2026-11-10", ""],
  ["T133", "techmania", "redacao", "Textos de e-mail", "C", RED, "2026-10-03", "2026-10-08", ""],
  ["T134", "techmania", "redacao", "Texto de landing page", "C", RED, "2026-10-20", "2026-10-22", ""],
  ["T135", "techmania", "redacao", "Textos de e-mail", "C", RED, "2026-11-03", "2026-11-08", ""],
  ["T136", "techmania", "conteudo", "Roteiro de reels", "C", SOC, "2026-10-17", "2026-10-22", ""],
  ["T137", "techmania", "conteudo", "Stories de lançamento", "C", SOC, "2026-10-29", "2026-10-31", ""],
  ["T138", "techmania", "conteudo", "Stories de lançamento", "C", SOC, "2026-11-05", "2026-11-08", ""],
  ["T139", "techmania", "conteudo", "Calendário de conteúdo do mês", "E", SOC, "2026-11-11", "", ""],
  // Vitta Suplementos
  ["T140", "vitta-suplementos", "crm", "Régua de pós-compra", "C", CRM, "2026-08-05", "2026-08-09", ""],
  ["T141", "vitta-suplementos", "crm", "Revisão da régua de boas-vindas", "C", CRM, "2026-09-03", "2026-09-07", ""],
  ["T142", "vitta-suplementos", "crm", "E-mail de carrinho abandonado", "C", CRM, "2026-10-08", "2026-10-10", ""],
  ["T143", "vitta-suplementos", "google-ads", "Revisão de palavras-chave negativas", "C", GADS, "2026-10-04", "2026-10-07", ""],
  ["T144", "vitta-suplementos", "google-ads", "Revisão de palavras-chave negativas", "C", GADS, "2026-10-18", "2026-10-24", ""],
  ["T145", "vitta-suplementos", "google-ads", "Revisão de palavras-chave negativas", "C", GADS, "2026-11-06", "2026-11-08", ""],
  ["T146", "vitta-suplementos", "meta-ads", "Ajuste de público", "C", META, "2026-10-22", "2026-10-25", ""],
  ["T147", "vitta-suplementos", "meta-ads", "Teste A/B de criativos", "C", META, "2026-10-28", "2026-10-31", ""],
  ["T148", "vitta-suplementos", "meta-ads", "Ajuste de público", "C", META, "2026-11-03", "2026-11-09", ""],
  ["T149", "vitta-suplementos", "materiais", "Peças para e-mail", "C", MAT, "2026-09-21", "2026-09-26", ""],
  ["T150", "vitta-suplementos", "materiais", "Banner de categoria", "C", MAT, "2026-10-06", "2026-10-12", ""],
  ["T151", "vitta-suplementos", "materiais", "Vídeo curto de produto", "C", MAT, "2026-10-25", "2026-10-28", ""],
  ["T152", "vitta-suplementos", "redacao", "Descrições de produto", "C", RED, "2026-10-04", "2026-10-08", ""],
  ["T153", "vitta-suplementos", "redacao", "Texto de landing page", "C", RED, "2026-10-23", "2026-10-26", ""],
  ["T154", "vitta-suplementos", "redacao", "Texto de landing page", "C", RED, "2026-11-07", "2026-11-10", ""],
  ["T155", "vitta-suplementos", "conteudo", "Posts da semana", "C", SOC, "2026-10-01", "2026-10-03", ""],
  ["T156", "vitta-suplementos", "conteudo", "Posts da semana", "C", SOC, "2026-10-09", "2026-10-11", ""],
  ["T157", "vitta-suplementos", "conteudo", "Roteiro de reels", "C", SOC, "2026-10-16", "2026-10-20", ""],
  ["T158", "vitta-suplementos", "conteudo", "Stories de lançamento", "E", SOC, "2026-11-11", "", ""],
  // Lojas em criação (frente Desenvolvimento)
  ["T159", "raiz-organicos", "desenvolvimento", "Briefing da loja", "C", DEV, "2026-08-05", "2026-08-12", ""],
  ["T160", "raiz-organicos", "desenvolvimento", "Estrutura de categorias e páginas", "C", WEB, "2026-08-13", "2026-08-25", ""],
  ["T161", "raiz-organicos", "desenvolvimento", "Layout da home para aprovação", "A", WEB, "2026-08-26", "", "2026-09-08"],
  ["T162", "raiz-organicos", "desenvolvimento", "Follow-up com o cliente (sem resposta)", "C", DEV, "2026-09-22", "2026-09-22", ""],
  ["T163", "raiz-organicos", "desenvolvimento", "Follow-up com o cliente (sem resposta)", "C", DEV, "2026-10-13", "2026-10-13", ""],
  ["T164", "lumi-acessorios", "desenvolvimento", "Briefing da loja", "C", DEV, "2026-10-06", "2026-10-10", ""],
  ["T165", "lumi-acessorios", "desenvolvimento", "Layout da home aprovado", "C", WEB, "2026-10-13", "2026-10-27", ""],
  ["T166", "lumi-acessorios", "desenvolvimento", "Páginas de produto", "E", WEB, "2026-11-03", "", ""],
  ["T167", "lumi-acessorios", "desenvolvimento", "Layout das páginas de categoria", "A", WEB, "2026-11-10", "", "2026-11-12"],
  // CRO / Melhorias do site
  ["T168", "aurora-moda", "cro", "Análise CRO da página de produto", "C", WEB, "2025-04-01", "2025-04-10", ""],
  ["T169", "ninho-casa-decor", "cro", "Ajuste de layout da home", "C", WEB, "2025-10-10", "2025-10-20", ""],
  ["T170", "techmania", "cro", "Teste A/B do checkout", "C", WEB, "2026-08-03", "2026-08-14", ""],
  ["T171", "doce-lar", "cro", "Melhoria do carrinho", "C", WEB, "2026-07-01", "2026-07-08", ""],
  ["T172", "mundo-kids", "cro", "Análise CRO da home", "C", WEB, "2026-05-20", "2026-05-28", ""],
]

const STATUS: Record<S, StatusAcao> = {
  C: "concluida",
  E: "em_andamento",
  A: "aguardando_aprovacao",
}

export function acoesPlanilha(): Acao[] {
  return T.map(([id, clientId, frenteId, titulo, s, responsavel, criada, concluida, aguardando]) => {
    const status = STATUS[s]
    const acao: Acao = {
      id: `planilha-${id.toLowerCase()}`,
      clientId,
      frenteId,
      titulo,
      // Concluída: data de conclusão; demais: data de criação.
      data: status === "concluida" ? concluida : criada,
      status,
      origem: "planilha",
      responsavel,
      criadaEm: criada,
    }
    if (status === "concluida") acao.concluidaEm = concluida
    if (status === "aguardando_aprovacao") acao.aguardandoDesde = aguardando
    return acao
  })
}

/** Frentes contratadas = pares cliente x frente com pelo menos uma tarefa. */
export function contratosPlanilha(): Contrato[] {
  const vistos = new Set<string>()
  const out: Contrato[] = []
  for (const l of T) {
    const chave = `${l[1]}|${l[2]}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    out.push({ clientId: l[1], frenteId: l[2] })
  }
  return out
}

export function montarPlanilha(): RadarSnapshot {
  return {
    clients: CLIENTES_PLANILHA.map((c) => ({ ...c })),
    frentes: FRENTES_PLANILHA.map((f) => ({ ...f })),
    contratos: contratosPlanilha(),
    acoes: acoesPlanilha(),
    checkups: [],
    atribuicoes: [],
    configuracao: {
      ...CONFIGURACAO_PADRAO,
      dataReferencia: DATA_REFERENCIA_PLANILHA,
    },
  }
}
