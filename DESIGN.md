---
name: Weethub Radar
description: Ferramenta de operação diária da agência Weethub para ver, por cliente e frente, o que está parado. Visual de painel SaaS (referência: painel de gestão de tarefas com trilho de ícones, fundo cinza-claro e cartões brancos), azul como cor de ação, amarelo Weethub só na marca. Nunito Sans, modo claro, densidade média.
colors:
  ink: "#1f2937"
  primary: "#1f6feb"
  primary-hover: "#1a5fd0"
  primary-foreground: "#ffffff"
  link: "#1d5fd1"
  accent: "#eef4fe"
  brand: "#fcbd20"
  brand-foreground: "#1f2937"
  canvas: "#f3f4f6"
  surface: "#ffffff"
  ink-muted: "#5f6672"
  line: "#e5e7eb"
  line-input: "#8c939f"
  state-ok: "#18794e"
  state-ok-soft: "#e7f6ee"
  state-ok-bar: "#2fb36b"
  state-warn: "#92510a"
  state-warn-soft: "#fff4d6"
  state-warn-bar: "#f2a31b"
  state-late: "#b34100"
  state-late-soft: "#ffeddf"
  state-late-bar: "#f57c22"
  state-crit: "#c62828"
  state-crit-soft: "#fdecec"
  state-crit-bar: "#e53935"
typography:
  family: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
  page-title: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }
  topbar-title: { fontSize: "1.125rem", fontWeight: 400, textTransform: uppercase, letterSpacing: "0.025em" }
  section: { fontSize: "1.25rem", fontWeight: 700 }
  kpi: { fontSize: "1.875rem", fontWeight: 800 }
  body: { fontSize: "0.9375rem", fontWeight: 400, lineHeight: 1.5 }
  label: { fontSize: "0.8125rem", fontWeight: 700 }
  overline: { fontSize: "0.75rem", fontWeight: 700, textTransform: uppercase, letterSpacing: "0.025em" }
rounded:
  sm: "4px"
  control: "6px"
  card: "8px"
  dialog: "12px"
  pill: "9999px (só contadores e avatares)"
shadow:
  card: "0 1px 2px rgb(16 24 40 / .05), 0 1px 3px rgb(16 24 40 / .06)"
  card-hover: "0 2px 4px rgb(16 24 40 / .06), 0 4px 12px rgb(16 24 40 / .08)"
  pop: "0 8px 24px rgb(16 24 40 / .12)"
spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" }
---

# Design System: Weethub Radar

> **Origem.** Esta versão segue o painel de referência aprovado (print "Meu painel": trilho de ícones à esquerda com bloco amarelo da marca, barra superior branca com o título da seção em caixa alta, fundo cinza-claro, cartões brancos com sombra curta, azul como cor de ação). Substitui a identidade editorial anterior (off-white, Fraunces, botões pretos em pílula). Todos os valores vivem em `src/app/globals.css`; os componentes só usam tokens.

## Overview

O Radar continua sendo uma mesa de triagem: o time abre, vê o que pede ação e despacha. O visual agora é o de um painel SaaS familiar: estrutura clara (trilho + barra superior + conteúdo em cartões), azul para tudo que é clicável, cor de estado só para dado.

**Key Characteristics:**
- Azul (`--primary`) é a cor de ação: botão principal, item ativo, aba ativa, links, foco.
- Amarelo Weethub (`--brand`) é marca: bloco do logo no trilho, ponto de "Nova", seleção de texto. Nunca texto sobre claro.
- Fundo cinza-claro (`--background`) e conteúdo em superfícies brancas com borda hairline + sombra curta (`.superficie` ou `rounded-lg border bg-card shadow-card`).
- Os quatro estados (em dia, atenção, atrasada, crítica) são o único uso de cor semântica, sempre com glifo + texto.
- Uma família só (Nunito Sans). Números sempre tabulares.

## Colors

### Ação e marca
- **Primário** `#1f6feb` (hover `#1a5fd0`), texto branco (4,6:1). **Link** `#1d5fd1` para texto azul sobre branco (5,6:1).
- **Accent** `#eef4fe`: fundo do item ativo do trilho, aba/contador ativo, hover de linhas e botões contorno.
- **Amarelo Weethub** `#fcbd20`: só fundo (bloco da marca, ponto "Nova"). Texto sobre ele é `#1f2937`.

### Neutros
- **Canvas** `#f3f4f6` (fundo da página), **Superfície** `#ffffff` (cartões, tabelas, trilho, barra superior, campos).
- **Tinta** `#1f2937`, **Tinta suave** `#5f6672` (5,9:1 sobre branco), **Linha** `#e5e7eb`, **Linha de campo** `#8c939f` (3,1:1, critério 1.4.11).
- Cabeçalho de tabela: `bg-gray-50`.

### Estados (texto / fundo suave / linha / barra)
Texto e fundo suave passam AA (≥ 4,5:1). A cor "barra" é a versão viva, usada só em áreas grandes de cor sem texto (barra de saúde).
- **Em dia** `#18794e` / `#e7f6ee` / `#b5e2c9` / `#2fb36b`
- **Atenção** `#92510a` / `#fff4d6` / `#f6d77e` / `#f2a31b`
- **Atrasada** `#b34100` / `#ffeddf` / `#fcc39b` / `#f57c22`
- **Crítica** `#c62828` / `#fdecec` / `#f5b5b5` / `#e53935` (também o destrutivo)

**A Regra do Estado Completo.** Cor de estado sempre vem com glifo e rótulo.
**A Regra do Amarelo de Marca.** Amarelo identifica a marca, não comunica estado nem ação.

## Typography

**Nunito Sans** via `next/font/google` (`--font-nunito`), em todo o UI.

- **Título da barra superior**: 18px, 400, caixa alta, tracking 0,025em ("RADAR", "CLIENTES > VELÔ BIKES").
- **Título de página (h1)**: 24–28px, 700.
- **Título de seção (h2)**: 18–20px, 700.
- **KPI**: 28–30px, 800, tabular. "Parado há" do cartão crítico: 28px, 800, cor de crítica.
- **Corpo**: 15px, 400. **Rótulo/chip**: 13px, 700.
- **Overline** (cabeçalho de tabela, "PARADO HÁ", rótulos do trilho): 11–12px, 700, caixa alta, tracking 0,025em.
- Botões: 15px, 600, **caixa normal** (sem caixa alta).

## Layout

- **Trilho de ícones** (76px, branco, borda à direita) a partir de 1024px: bloco amarelo de 64px com a marca no topo; itens de 64px com ícone (20px) + rótulo curto em caixa alta; ativo = fundo accent + texto/ícone azul; contagens como bolinha azul sobre o ícone; Configurações ("Ajustes") separado embaixo. Abaixo de 1024px: botão de menu abre a lista completa (ícone + rótulo) num painel lateral.
- **Barra superior** (64px, branca, sempre visível): título da seção em caixa alta ou caminho Clientes › Cliente; à direita, o selo "Dados de demonstração" (leva a Configurações).
- **Conteúdo**: largura máxima 1320px, margens 16/32/40px. Cabeçalho da página (h1 + subtítulo + ações à direita), depois cartões.

## Elevation & Shapes

- Cartões e tabelas: raio 8px, borda `#e5e7eb`, `shadow-card`; cartão clicável sobe para `shadow-card-hover`.
- Controles (botão, campo, select, toggle, chip de estado): raio 6px.
- Diálogos e popovers: raio 12px, `shadow-pop`, véu `gray-900/45`.
- Pílula só para contadores (abas, trilho) e avatares.

## Components

### Buttons
36px de altura, raio 6px, 15px/600, caixa normal.
- **Primário**: azul cheio, texto branco, `shadow-card`. Um por tela.
- **Contorno**: fundo branco, borda `#e5e7eb`, texto azul; hover accent.
- **Secundário**: fundo accent, texto azul (equivalente a "Mais filtros" da referência).
- **Ghost**: texto cinza, hover cinza. **Destrutivo**: branco com borda e texto vermelho.

### Abas
Texto 15px/700 cinza; ativa em azul com sublinhado azul de 2px; contador em pílula cinza (ativa: accent + azul). A lista de abas tem linha inferior própria; os filtros ficam numa linha abaixo, precedidos de "Filtrar por".

### Painel "Saúde da carteira"
Cartão branco. Barra segmentada de 10px, segmentos arredondados com 4px de intervalo nas cores "barra" dos estados; legenda com glifo, contagem e %. Grade de 4 KPIs separados por linhas; selecionado = fundo accent + sublinhado na cor do estado.

### Cartão de oportunidade
**Crítica**: cartão cheio com nome (hover azul), chip de estado, motivo, consequência, metadados; à direita overline "PARADO HÁ", número 800 em vermelho de crítica, prazo e "Ver proposta" primário. **Atrasada / travada**: linha compacta dentro de um cartão-lista, "Ver proposta" em contorno. "Nova" = ponto amarelo de 6px (+ texto para leitor de tela).

### Chips de estado e células da grade
Raio 6px, fundo suave + linha + texto do estado + glifo. "Em dia" na grade é só "5 d" em cinza. Glifos: círculo cheio (em dia), meio círculo (atenção), anel (atrasada), X (crítica), traço (nunca). Aprovação travada = canto marcado.

### Tabelas
Cartão branco; cabeçalho `bg-gray-50` com overline cinza; linhas com divisor hairline e hover accent a 50%.

### Inputs
Branco, borda `#8c939f`, raio 6px, 36px; foco com anel azul de 2px.

## Movimento

Animação serve para mostrar **mudança de dado** e **entrada de tela**, nunca para enfeitar. Feita com GSAP (`gsap` + `@gsap/react`), centralizada em `src/lib/motion/`: `gsap.ts` (registro único), `tokens.ts` (durações 0,15 a 0,6 s; curvas `power2.out` e `power3.out`, nada elástico), `movimento.ts` (`gsap.matchMedia()` com `prefers-reduced-motion`), `use-entrada.ts`, `numero.tsx` (contagem), `use-flip-lista.ts` (listas) e `aparece.ts` (confirmações inline).

- **Só transform e opacidade.** Única exceção: a largura (`flex-grow`) dos segmentos da barra de saúde, porque é o dado.
- **Tudo dentro de `useGSAP` com `scope`** (ou ref de função, no caso dos diálogos); nada de GSAP durante a renderização no servidor. Sem ScrollTrigger, ScrollSmoother nem SplitText: é ferramenta de operação.
- **Com `prefers-reduced-motion: reduce` não há movimento**: o estado final aparece na hora.
- Entrada de tela: blocos marcados com `data-entra` sobem 8 px e aparecem em sequência (0,04 s).
- Painel de saúde: números contam até o novo valor (0,6 s), os segmentos da barra crescem até a proporção nova (partindo da última mostrada) e o sublinhado do indicador selecionado desliza.
- Lista do Radar, Grade, Clientes e linha do tempo da ficha: quem fica desliza para o novo lugar (FLIP), quem entra sobe e aparece, quem sai deixa um fantasma que some. Na Grade, a célula que mudou de estado pisca (opacidade, 0,6 s).
- Diálogos: opacidade + escala 0,98 a 1 (0,18 s) na abertura e no fechamento; "Copiado" e "Atribuída ao setor ..." entram com fade + 4 px.
- O painel do "Menu" do celular desliza por CSS (Radix).

## Política de ícones

- Ícones `lucide-react` (traço 2px) **na navegação** (trilho e menu do celular), no caminho da barra superior (chevron) e no selo de demonstração.
- Botões de ação, abas e cabeçalhos continuam só com texto.
- Glifos de estado não são ícones: são dado (`EstadoGlyph`).

## Do's and Don'ts

### Do
- **Do** usar só tokens (`--primary`, `--link`, `--accent`, `--brand`, `--state-*`, `shadow-card`).
- **Do** manter conteúdo em superfícies brancas sobre o fundo cinza.
- **Do** mostrar o motivo de cada alerta em números (dias, prazo).
- **Do** manter "Em dia" discreto.

### Don't
- **Don't** usar o amarelo como texto, cor de estado ou cor de ação.
- **Don't** usar azul para estado (azul = clicável).
- **Don't** usar caixa alta em botões ou texto corrido (só barra superior, overlines e trilho).
- **Don't** usar sombras grandes, gradientes ou glassmorphism.
- **Don't** depender só de cor para comunicar estado.
