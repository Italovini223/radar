# Weethub Radar (protótipo da Sprint 1)

Radar de clientes esquecidos do Campeonato Weethub de Soluções: mostra, por **cliente e frente**, há quantos dias nada é feito, e transforma o que está parado em oportunidades. Protótipo navegável, com **dados fictícios** guardados só no navegador. Sem login, sem banco, sem chave de API.

- Alerta por **regra fixa** (prazo por frente x dias desde a última ação concluída). Não há IA decidindo nada.
- A IA aparece só como **gerador simulado de rascunho** de proposta, que uma pessoa revisa (`src/lib/ai/proposal.ts`).
- Escopo da v1 e o que fica de fora: [`docs/escopo-v1.md`](docs/escopo-v1.md). Modelo de dados e plano para o Supabase: [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md). Produto e visual: [`PRODUCT.md`](PRODUCT.md) e [`DESIGN.md`](DESIGN.md).

## Como rodar

Requer Node 20+ e pnpm (`corepack enable` ativa o pnpm que vem com o Node).

```bash
pnpm install
pnpm dev          # http://localhost:3000  (redireciona para /radar)
pnpm test         # vitest: motor de regras e oráculo dos gargalos plantados
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # build de produção
```

## Telas

| Rota | Tela |
|---|---|
| `/radar` | Painel "Saúde da carteira" (barra por estado + 4 indicadores que filtram), abas, busca e filtro por setor (filtros na URL), críticas em cartão cheio, demais em linha, diálogo de proposta |
| `/grade` | Grade cliente x frente com estado em cada célula |
| `/clientes` | Lista de clientes |
| `/clientes/[id]` | Ficha: frentes, linha do tempo, registrar ação |
| `/checkup` | Check-up manual (~5 min por cliente) |
| `/configuracoes` | Prazos por frente e reset dos dados de demonstração |

## Stack

Next.js 16.4 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (base Radix, estilo `radix-nova`, lucide-react só dentro de `components/ui`) + date-fns (`pt-BR`) + zustand (`persist` em localStorage) + GSAP (`gsap` + `@gsap/react`, só transform e opacidade, respeita `prefers-reduced-motion`) + vitest. Fontes via `next/font`: Fraunces (títulos, "Parado há" do cartão crítico, wordmark) e Urbanist (UI). Identidade visual extraída do site weethub.com (preto, off-white `#fffff7`, acento amarelo `#fcbd20`); o roxo do mockup foi descartado. Ver [`docs/identidade.md`](docs/identidade.md).

## Estrutura

```
src/
  app/                       rotas (radar, grade, clientes, clientes/[id], checkup, configuracoes)
  components/ui/             shadcn (gerado pela CLI)
  components/radar/          painel de saúde, cartão de oportunidade, diálogos, telas
  components/grade/          FrenteCell, GradeTable, Legend
  components/layout/         AppShell, AppSidebar, NavLista, MobileNav, Topbar
  lib/domain/                types, rules (puras), opportunities, checkup
  lib/ai/proposal.ts         gerador SIMULADO de rascunho (interface para trocar por Claude)
  lib/data/repository.ts     interface + implementação localStorage (trocar por Supabase na Sprint 2)
  lib/data/seed.ts           dados fictícios com gargalos plantados
  lib/store.ts               zustand + persist
  lib/motion/                animações GSAP (tokens, reduced-motion, entrada, contagem, listas)
  lib/rules.test.ts          testes (oráculo)
components/brand/          RadarMark e RadarLogo (marca do sistema)
docs/                        escopo-v1.md, modelo-de-dados.md, identidade.md, brand/board.html
PRODUCT.md  DESIGN.md        contexto de produto e tokens visuais
```

## Dados de demonstração

O seed é gerado relativo a **hoje**, então os gargalos aparecem sempre:

| Cliente | Gargalo plantado | Estado |
|---|---|---|
| Flor de Sal | Google Ads parado há 40 dias | atrasada |
| Casa Nativa | Layout há ~2 anos | crítica |
| Velô Bikes | CRM sem nenhuma ação | crítica (nunca) |
| Nossa Horta | Conteúdo/Social parado há 90 dias | crítica |
| Aurora Pet | em dia; ação em aprovação há 10 dias | só alerta de aprovação |

Para testar: faça um check-up de Flor de Sal informando a data de hoje em Google Ads (o Radar perde essa oportunidade), mude um prazo em Configurações, recarregue a página (os dados persistem) e use "Resetar dados de demonstração" para voltar ao início.

## Desvios do plano

- **Next.js 16.4, não 15.** Versão instalada pelo `create-next-app`. Com ela, `cacheComponents` e `partialPrefetching` vêm ligados por padrão; foram **desligados** em `next.config.ts` porque o app é 100% estado no navegador e exigiriam Suspense em volta do shell inteiro. Pacote de Tailwind é `@tailwindcss/turbopack` (gerado pelo template).
- **pnpm via corepack.** O pnpm não estava instalado na máquina; foi ativado com `corepack enable`. `packageManager` no `package.json` fixa a versão.
- **shadcn mais recente** (CLI 4.x): `cn` vem do pacote `cn`, estilo `radix-nova`. Ajustes nos arquivos gerados: textos "Close" e "Toggle Sidebar" traduzidos; `transition-all` trocado por lista de propriedades; a sidebar fixa só aparece a partir de 1024 px; abaixo disso a barra superior traz o botão "Menu", que abre a mesma lista.
- **Flor de Sal com 40 dias, não 47.** 47/30 = 157% cairia em crítica pela regra dos 150%, contradizendo o "atrasada" do plano. Mantivemos a regra e ajustamos o dado (ver `docs/escopo-v1.md`).
- **Aurora Pet** é o nome do 5º cliente (fictício) de controle; responsáveis são squads, não pessoas.
- **Mockup:** removidos "Receita potencial" e "R$ potencial" (dado financeiro inventado, fora do escopo), tendências ("12% vs. mês passado"), horários de detecção falsos, botões "···" e itens de menu sem função. O 4º cartão virou "Aguardando aprovação".
- **Impeccable:** o launcher `scripts/impeccable` **não foi executado** (alerta de segurança). Foram lidos apenas os arquivos de `reference/`. O agente "finish reviewer" da skill não foi usado; a revisão de qualidade foi feita com `web-design-guidelines` e uma passada manual pelos critérios de `audit.md`.
- **Troca de identidade (roxo para preto/amarelo).** Decisão do responsável técnico: paleta e fontes do site weethub.com, política de "menos ícones" (só X de fechar, chevrons do select e glifos de estado), cartões de raio máx. 6 px e botões em pílula. O board da marca (`docs/brand/board.html`) é HTML/SVG feito à mão: a skill `brandkit` pede um gerador de imagens que não temos.
- `.impeccable/design.json` (sidecar do DESIGN.md) não foi gerado.

## Segurança e privacidade

Nenhuma chave, token ou senha no código; `.env*` está no `.gitignore`. Nenhum nome real de cliente, nenhum dado financeiro ou pessoal.
