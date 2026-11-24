# Weethub Radar (Sprint 2)

Radar de clientes esquecidos do Campeonato Weethub de Soluções: mostra, por **cliente e frente**, há quantos dias nada é feito, e transforma o que está parado em oportunidades. Protótipo com **dados fictícios** guardados num banco (Supabase), acessado **só pelo servidor** do Next. Sem login (fica para a Sprint 3).

- Alerta por **regra fixa** (prazo por frente x dias desde a última ação concluída). Não há IA decidindo nada.
- A IA aparece só como **gerador simulado de rascunho** de proposta, que uma pessoa revisa (`src/lib/ai/proposal.ts`).
- Escopo da v1 e o que fica de fora: [`docs/escopo-v1.md`](docs/escopo-v1.md). Modelo de dados, tabelas e API: [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md). Teste documentado: [`docs/testes/TESTE-001-gabarito.md`](docs/testes/TESTE-001-gabarito.md). Contribuições: [`docs/contribuicoes-sprint-2.md`](docs/contribuicoes-sprint-2.md). Produto e visual: [`PRODUCT.md`](PRODUCT.md) e [`DESIGN.md`](DESIGN.md).

## Como rodar

Requer Node 20+ e pnpm (`corepack enable` ativa o pnpm que vem com o Node).

```bash
pnpm install
cp .env.example .env.local   # preencha SUPABASE_SERVICE_ROLE_KEY (ver abaixo)
pnpm dev                     # http://localhost:3000  (redireciona para /radar)
pnpm test                    # vitest (pasta test/): regras, gabarito, API, store (sem rede, sem segredo)
pnpm typecheck               # tsc --noEmit
pnpm lint                    # eslint
                             # o CI roda typecheck, lint, test e build a cada PR: docs/ci-e-protecao-da-main.md
pnpm build                   # build de produção
```

### Variáveis de ambiente (só do servidor)

| Variável | Para quê |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave de serviço (ignora RLS; **só servidor**) |

`.env.example` está versionado (sem valor para a chave); `.env.local` é ignorado pelo git. Na Vercel, cadastre as mesmas duas variáveis. **Nunca** use prefixo `NEXT_PUBLIC_` nelas e nunca commite a chave: o navegador não fala com o Supabase, só com `/api/radar` (RLS ligado nas tabelas, sem políticas). Sem as variáveis, a API responde 503 `BANCO_NAO_CONFIGURADO` e a tela mostra "Banco de dados não configurado".

### Modo memória (só desenvolvimento)

Para trabalhar sem a chave do Supabase:

```bash
RADAR_DB=memoria pnpm dev         # banco em memória já semeado com a planilha real (10 clientes, 172 tarefas)
RADAR_DB=memoria-vazia pnpm dev   # começa vazio (para ver o estado "Carregar dados de demonstração")
```

O estado vive no processo do servidor: recarregar a página mantém os dados; reiniciar o servidor os apaga. **Em produção (`NODE_ENV=production`) `RADAR_DB` é ignorado**: o app usa sempre o Supabase (testado em `src/lib/server/banco-instancia.test.ts`). Ao testar de outro dispositivo da rede, pode ser preciso liberar o IP em `allowedDevOrigins` no `next.config.ts` (só durante o teste; não commite).

### Como carregar (ou recarregar) a demonstração

- Banco vazio: a tela mostra o botão **Carregar dados de demonstração** (pede confirmação, porque substitui o conteúdo do banco).
- Banco com dados: **Configurações > Resetar dados de demonstração** (chama `POST /api/radar/resetar`, que reimporta o dataset da planilha, inclusive a configuração).
- Via API: `POST /api/radar/importar` com um dataset JSON (ver `docs/modelo-de-dados.md`).

## Telas

| Rota | Tela |
|---|---|
| `/radar` | Painel "Saúde da carteira" ("N de M clientes precisam de ação", barra de clientes Crítico/Atenção/Ok + 4 indicadores de frentes que filtram), gráfico "Alertas por frente", abas, busca, filtro por setor e "Agrupar por cliente" (filtros na URL), aviso "mais N alertas" no cartão, "Recalcular alertas", críticas em cartão cheio, demais em linha, "Ver proposta" e "Registrar ação" direto no cartão, confirmação "alerta resolvido + próxima oportunidade" |
| `/grade` | Grade cliente x frente com estado em cada célula, coluna Cliente fixa, "—" nas frentes não contratadas e legenda de leitura |
| `/clientes` | Lista de clientes com a situação (Crítico / Atenção / Ok) |
| `/clientes/[id]` | Ficha: situação, frentes contratadas, bloco de loja em criação (bloqueio contratual), linha do tempo com responsável, registrar ação |
| `/checkup` | Check-up manual (~5 min por cliente) |
| `/configuracoes` | Data de referência, "hoje real", limites (aprovação, bloqueio contratual), prazos e "vira crítico após" por frente, reset da demonstração |

## Stack

Next.js 16.4 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (base Radix, estilo `radix-nova`, lucide-react só dentro de `components/ui`) + date-fns (`pt-BR`) + zustand (store otimista; sem persistência local) + Supabase só no servidor (`@supabase/supabase-js`) + zod + GSAP (`gsap` + `@gsap/react`, só transform e opacidade, respeita `prefers-reduced-motion`) + vitest. Fonte via `next/font`: Geist em todo o UI. Identidade visual extraída do site weethub.com (preto, off-white `#fffff7`, acento amarelo `#fcbd20`); o roxo do mockup foi descartado. Ver [`docs/identidade.md`](docs/identidade.md).

## Estrutura

```
src/
  app/                       rotas (radar, grade, clientes, clientes/[id], checkup, configuracoes)
  components/ui/             shadcn (gerado pela CLI)
  components/radar/          painel de saúde, cartão de oportunidade, diálogos, telas
  components/grade/          FrenteCell, GradeTable, Legend
  components/layout/         AppShell, AppSidebar, NavLista, MobileNav, Topbar
  app/api/radar/             route handlers (GET /, acoes, checkups, frentes/[id], atribuicoes, configuracao, importar, resetar)
  lib/domain/                types, rules, opportunities, checkup, pos-acao, rotulos (puras)
  lib/server/                supabase (server-only), banco (interface), radar-db (operações), schemas (zod), http, modo-banco/banco-memoria (dev)
  lib/ai/proposal.ts         gerador SIMULADO de rascunho (interface para trocar por Claude)
  lib/data/repository.ts     interface RadarRepository (operações granulares)
  lib/data/api-repository.ts implementação por fetch aos route handlers
  lib/data/planilha-dataset.ts  dataset REAL da demonstração (planilha: 10 clientes, 8 frentes, 172 tarefas) + GABARITO_PLANILHA
  lib/data/gabarito-fixture.ts  fixture sintética pequena, só para testes unitários
  lib/store.ts               zustand otimista (aplica, grava, reverte em falha)
  lib/motion/                animações GSAP (tokens, reduced-motion, entrada, contagem, listas)
test/                      testes (vitest), centralizados e separados por categoria:
  test/domain/             unitários do domínio puro (rules, pos-acao, rotulos)
  test/server/             API, banco (com banco falso em memória), schemas, supabase, modo memória
  test/client/             store otimista, confirmação pós-ação, cliente HTTP (api-repository)
  test/gabarito/           aceitação: gabarito da planilha (situação por cliente, alertas esperados)
  test/support/            apoio: banco-fake, stub do server-only
components/brand/          RadarMark (marca do sistema)
docs/                        escopo-v1.md, modelo-de-dados.md, identidade.md, brand/board.html
PRODUCT.md  DESIGN.md        contexto de produto e tokens visuais
```

## Dados de demonstração e regras do gabarito

A demonstração é a **planilha real** do time, 100% fictícia (`src/lib/data/planilha-dataset.ts`: 10 clientes, 8 frentes e 172 tarefas, transcritas da planilha; as frentes contratadas vêm das tarefas), com "hoje" = **13/11/2026** (data de referência da configuração). A planilha só traz responsável por tarefa: o responsável por cliente fica vazio e não é exibido. O motor segue as regras da planilha:

- **Atrasada**: dias sem ação > prazo da frente. **Crítica**: dias >= "vira crítico após" (coluna própria). **Perto do prazo** (>= 75% do prazo; identificador interno `atencao`): só aviso, não gera alerta. "Atenção" é só a situação do cliente.
- **Aprovação travada**: ação aguardando aprovação há **mais de 5 dias** (configurável).
- **Frente contratada**: o par cliente x frente só existe se contratado.
- **Loja em criação** (frente Desenvolvimento): o relógio é "dias sem retorno do cliente" (30 / 60), com bloqueio contratual em 90 dias (mostra quantos faltam).
- **Situação do cliente**: Crítico (alguma frente crítica), Atenção (alguma atrasada ou aprovação travada), Ok (nenhuma; avisos permitidos).

Situações esperadas em 13/11/2026: Aurora Moda, Ninho Casa & Decor e Raiz Orgânicos = Crítico; Patas Pet Store, Vitta Suplementos e Bella Pele Cosméticos = Atenção; TechMania, Doce Lar Utilidades, Mundo Kids Brinquedos e Lumi Acessórios = Ok. Com a planilha real, o Radar lista **10 oportunidades** (Aurora Moda 4, Ninho 2, Patas 1, Vitta 1, Bella 1, Raiz 1). Os testes automáticos estão em `src/lib/data/planilha.test.ts` (dataset real), `src/lib/server/planilha-servidor.test.ts` (o que o servidor grava) e `src/lib/gabarito.test.ts` (fixture sintética); o roteiro manual em `docs/testes/TESTE-001-gabarito.md`.

**Tarefa principal:** registrar uma ação para um cliente (ficha, cartão do Radar ou check-up) e ver o Radar atualizar os alertas e sugerir a próxima oportunidade. Ex.: Aurora Moda > Google Ads > "Otimização de Google Ads feita hoje": o alerta some e a próxima sugerida é CRO / Melhorias do site (crítica, ~19 meses).

## Desvios do plano (Sprint 1, histórico)

> Algumas linhas abaixo descrevem a Sprint 1 (dados só no navegador, seed de 5 clientes). O que vale hoje está nas seções acima.

- **Next.js 16.4, não 15.** Versão instalada pelo `create-next-app`. Com ela, `cacheComponents` e `partialPrefetching` vêm ligados por padrão; foram **desligados** em `next.config.ts` porque o app é 100% estado no navegador e exigiriam Suspense em volta do shell inteiro. Pacote de Tailwind é `@tailwindcss/turbopack` (gerado pelo template).
- **pnpm via corepack.** O pnpm não estava instalado na máquina; foi ativado com `corepack enable`. `packageManager` no `package.json` fixa a versão.
- **shadcn mais recente** (CLI 4.x): `cn` vem do pacote `cn`, estilo `radix-nova`. Ajustes nos arquivos gerados: textos "Close" e "Toggle Sidebar" traduzidos; `transition-all` trocado por lista de propriedades; a sidebar fixa só aparece a partir de 1024 px; abaixo disso a barra superior traz o botão "Menu", que abre a mesma lista.
- **Flor de Sal com 40 dias, não 47.** 47/30 = 157% cairia em crítica pela regra dos 150%, contradizendo o "atrasada" do plano. Mantivemos a regra e ajustamos o dado (ver `docs/escopo-v1.md`).
- (Sprint 1) "Aurora Pet" era o 5º cliente de controle do seed antigo; hoje a demonstração é a planilha da Sprint 2.
- **Mockup:** removidos "Receita potencial" e "R$ potencial" (dado financeiro inventado, fora do escopo), tendências ("12% vs. mês passado"), horários de detecção falsos, botões "···" e itens de menu sem função. O 4º cartão virou "Aguardando aprovação".
- **Impeccable:** o launcher `scripts/impeccable` **não foi executado** (alerta de segurança). Foram lidos apenas os arquivos de `reference/`. O agente "finish reviewer" da skill não foi usado; a revisão de qualidade foi feita com `web-design-guidelines` e uma passada manual pelos critérios de `audit.md`.
- **Troca de identidade (roxo para preto/amarelo).** Decisão do responsável técnico: paleta e fontes do site weethub.com, política de "menos ícones" (só X de fechar, chevrons do select e glifos de estado), cartões de raio máx. 6 px e botões em pílula. O board da marca (`docs/brand/board.html`) é HTML/SVG feito à mão: a skill `brandkit` pede um gerador de imagens que não temos.
- `.impeccable/design.json` (sidecar do DESIGN.md) não foi gerado.

## Segurança e privacidade

Nenhuma chave, token ou senha no código; `.env*` está no `.gitignore` (exceto `.env.example`, sem segredo). Nenhum nome real de cliente, nenhum dado financeiro ou pessoal. O cliente Supabase usa a chave de serviço **só no servidor** (`import "server-only"`); o navegador nunca fala com o banco; entradas validadas com zod; erros internos não vazam para a resposta. **Sem login nesta sprint**: qualquer pessoa com o link grava dados fictícios (a Sprint 3 fecha com login e perfis).
