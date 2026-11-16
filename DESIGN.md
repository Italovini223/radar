---
name: Weethub Radar
description: Ferramenta de operação diária da agência Weethub para ver, por cliente e frente, o que está parado. Identidade do site weethub.com (preto, off-white quente e um acento amarelo; Fraunces + Urbanist), modo claro, poucos ícones, densidade média.
colors:
  ink: "#0a0a0a"
  primary: "#0a0a0a"
  primary-foreground: "#fffff7"
  brand: "#fcbd20"
  brand-foreground: "#0a0a0a"
  canvas: "#fffff7"
  surface: "#ffffff"
  surface-quiet: "#f4f3ea"
  ink-muted: "#5b5b53"
  line: "#e7e7e7"
  line-input: "#85847a"
  state-ok: "#1d6a3b"
  state-ok-soft: "#e8f2e6"
  state-ok-line: "#bcd9b8"
  state-warn: "#7a4a06"
  state-warn-soft: "#f5e8cc"
  state-warn-line: "#e0c58b"
  state-late: "#a3410d"
  state-late-soft: "#fbe6d6"
  state-late-line: "#efbf9d"
  state-crit: "#a8221a"
  state-crit-soft: "#fbe4e1"
  state-crit-line: "#efb4ae"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  numeral:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1
  kpi:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "3px"
  md: "4px"
  card: "6px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
  card-opportunity:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  painel-saude:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  grid-cell-alert:
    backgroundColor: "{colors.state-late-soft}"
    textColor: "{colors.state-late}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: Weethub Radar

> **Origem da identidade.** As cores, as fontes e o estilo dos botões vêm do site real da Weethub (weethub.com), medidos no navegador. O roxo `#635bdb` (e as fontes DM Sans e Manrope) do mockup inicial foi **descartado** por decisão do responsável técnico: o roxo denunciava "feito por IA". A estratégia da marca, a construção do logo e as regras de uso estão em [`docs/identidade.md`](docs/identidade.md); o painel visual está em `docs/brand/board.html`.

## Overview

**Creative North Star: "A Mesa de Triagem"**

O Radar é uma mesa de triagem: o time chega, vê rápido o que pede ação e despacha. Tudo que não ajuda a decidir fica quieto. O modo é Operate (ferramenta de uso diário): escaneabilidade e consistência valem mais que expressão. A marca aparece nos detalhes precisos: preto e off-white como o site, um único acento amarelo, serifa só no título de página e no "Parado há" do cartão crítico, botões em pílula com rótulo em caixa alta (e só neles).

Cena de uso: gestor de conta, em escritório com luz de dia, abre o Radar no início do expediente e passa os olhos pela grade. Por isso só existe modo claro. Densidade média: cartões de oportunidade com uma linha de motivo, e uma grade 5 x 8 que cabe sem rolagem em 1440 px.

**Key Characteristics:**
- Preto é a cor de ação (botões, estado ativo). O amarelo é acento raro.
- Hierarquia por tipografia e espaçamento, não por enfeite: bordas hairline, sem gradiente, sem sombra, sem cantos exagerados.
- Os quatro estados (em dia, atenção, atrasada, crítica) são o único uso de cor semântica; "em dia" fica discreto.
- Estado nunca depende só de cor: glifo de forma própria + texto.
- Poucos ícones (ver "Política de ícones"). Números sempre tabulares.

## Colors

Paleta contida: preto, off-white quente, um acento amarelo, neutros quentes e quatro cores de estado. Nenhum matiz azul-violeta em lugar nenhum (inclui seleção de texto e barra de rolagem).

### Marca
- **Tinta** (#0a0a0a): texto principal e cor **primária**: botão cheio (texto #fffff7), item ativo, anel de foco.
- **Amarelo Weethub** (#fcbd20): o acento. Usos permitidos, e só estes: marca/logo (setor do radar), sublinhado da aba ativa, marcador do item ativo da sidebar, ponto de 6 px de "Nova", seleção de texto (com texto preto). Fica de fora do painel de saúde. **Nunca como texto sobre fundo claro** (1,7:1); só como fundo ou linha. Sobre amarelo, o texto é preto (11,7:1).

### Neutral
- **Canvas** (#fffff7): fundo da página, o off-white quente do site.
- **Superfície** (#ffffff): cartões, tabelas, campos, sidebar e barra superior.
- **Superfície Quieta** (#f4f3ea): faixas secundárias, hover, KPI selecionado.
- **Linha** (#e7e7e7): toda borda e divisor (1 px). **Linha de campo** (#85847a): bordas de input e select (3,8:1 sobre branco, critério 1.4.11).
- **Tinta Suave** (#5b5b53): texto secundário. 6,8:1 sobre canvas, 6,9:1 sobre branco, 6,2:1 sobre a superfície quieta.

### Estados (texto / fundo suave / linha)
- **Em dia** verde (#1d6a3b / #e8f2e6 / #bcd9b8), 5,8:1.
- **Atenção** âmbar terroso (#7a4a06 / #f5e8cc / #e0c58b), 6,2:1. De propósito longe do amarelo da marca, que **nunca** é a cor de um estado nem aparece em chip de estado.
- **Atrasada** laranja queimado (#a3410d / #fbe6d6 / #efbf9d), 5,2:1.
- **Crítica** vermelho (#a8221a / #fbe4e1 / #efb4ae), 5,9:1. O destrutivo do shadcn usa o mesmo vermelho.

Contrastes calculados pela fórmula WCAG; todos os textos de estado passam AA (4,5:1) no fundo suave. A borda dos campos (#85847a) tem 3,8:1 contra o branco e passa o critério 1.4.11 (componentes de interface, 3:1).

### Named Rules
**A Regra do Estado Completo.** Cor de estado sempre vem com glifo e rótulo. Se a tela for impressa em preto e branco, continua legível.
**A Regra do Amarelo Raro.** O amarelo ocupa muito menos de 10% de qualquer tela e nunca é texto sobre claro. Se tudo é amarelo, nada é acento.
**A Regra do Foco Preto.** Foco = anel preto de 2 px com offset de 2 px (contraste 19:1). O amarelo não serve de foco sobre fundo claro.

## Typography

**Fraunces** (serifa, display) e **Urbanist** (sans, UI), as fontes do site, via `next/font/google` com `display: swap`.

**Fraunces apenas em:** o h1 de cada página, o numeral "Parado há" do cartão de oportunidade crítica e o wordmark "Radar". **O itálico existe só no h1 do `/radar`** ("Radar de *clientes*"); nas demais telas o título e o nome de cliente ficam em romano (Fraunces 500). Os números do painel de saúde são Urbanist 700, em tinta. **Todo o resto é Urbanist.**

Urbanist tem x-height baixo, então a escala sobe um degrau: corpo 15 px (`text-sm`) e texto auxiliar 13 px (`text-xs`). Nada abaixo de **12 px**. **Caixa alta com tracking só nos botões** (12 px, 0,08em); rótulos auxiliares ficam em caixa baixa, Urbanist 600, 13 px (classe `.eyebrow`). A única exceção é "WEETHUB" no lockup da marca (12 px, a 70% de opacidade).

### Hierarchy
- **Display** (Fraunces 500, 2,25 a 2,75 rem, 1,1): h1 da página; itálico 400 na palavra de destaque.
- **Numeral** (Fraunces 500, 1,875 rem): "Parado há" do cartão crítico. Tabular.
- **KPI** (Urbanist 700, 1,75 a 1,875 rem, tinta): números do painel de saúde. Tabular.
- **Headline** (Urbanist 600, 1,25 rem): título de seção (h2) e de diálogo.
- **Title** (Urbanist 700, 1,125 rem): nome do cliente no cartão.
- **Body** (Urbanist 400, 0,9375 rem, 1,5): texto corrido e células.
- **Label** (Urbanist 600, 0,8125 rem): cabeçalhos de tabela, legendas, chips.

### Named Rules
**A Regra do Número Tabular.** Todo número que se compara (dias, prazos, contagens) usa `tnum`.

## Layout

Shell de aplicativo: sidebar à esquerda (16 rem) a partir de 1024 px; abaixo disso ela some e o botão **"Menu"** da barra superior abre a mesma lista num painel lateral (alvos de 48 px). A barra superior (56 px) só aparece no desktop quando há um nível a mostrar (breadcrumb "Clientes / Flor de Sal"); nas demais telas o h1 já diz onde você está. Conteúdo com largura máxima de 1296 px e margens de 16/32/44 px conforme a tela. Ritmo de espaçamento em múltiplos de 4 px; mais espaço acima de um título que abaixo dele. Tabelas largas rolam dentro do próprio contêiner; a página nunca rola na horizontal.

Ordem de leitura do `/radar`: título e subtítulo com a data ("Atualizado hoje, 16 nov. · 5 oportunidades"), painel de saúde, abas e filtros, lista. A ficha do cliente só põe a linha do tempo ao lado a partir de 1400 px; abaixo de `md` as frentes viram cartões empilhados com o Estado visível (sem tabela cortada).

## Elevation & Depth

Plano. Nenhuma sombra de cartão, tabela ou botão: a hierarquia vem de tipografia, espaçamento e borda hairline (#e7e7e7). Os únicos elementos sobrepostos são diálogos (véu preto a 40%) e a lista do select, ambos com borda.

## Shapes

Cartões, tabelas, campos e diálogos: **raio máximo de 6 px** (`--radius: 6px`; todos os degraus `xl` a `4xl` do Tailwind foram limitados a 6 px). **Botões, chips e toggles são pílula** (`rounded-full`), como no site. Sem avatares.

## Components

### Buttons
Pílula de 36 px, rótulo em Urbanist 12 px, 600, **caixa alta, tracking 0,08em**. Primário = preto com texto #fffff7 (um por tela); contorno = pílula com borda preta e fundo transparente (hover inverte para preto). Destrutivo = contorno vermelho. **Sem ícone em nenhum botão.** Foco: anel preto de 2 px com offset de 2 px.

### Painel "Saúde da carteira"
Um único cartão branco (borda hairline, raio 6 px) no topo do `/radar`. **Barra segmentada** de 12 px com os pares cliente x frente por estado (em dia, atenção, atrasada, crítica), 2 px de intervalo, legenda em uma linha com glifo, contagem e porcentagem, e `aria-label` com o resumo completo. Abaixo, uma grade de 4 indicadores separados por linhas hairline: **Críticas, Atrasadas, Em atenção, Aguardando aprovação** (2 x 2 no celular). Número em Urbanist 700, tinta; glifo e rótulo na cor do estado; apoio em cinza. Críticas, Atrasadas e Aguardando aprovação são botões que filtram a lista (selecionado = fundo quieto + sublinhado de 2 px na cor do estado; clicar de novo volta para "Todas"). "Em atenção" não gera oportunidade, então leva à Grade. Sem tendências nem sparklines: não há histórico.

### Cartão de oportunidade
Duas densidades. **Crítica**: cartão cheio (borda hairline, raio 6 px) com nome do cliente (link), chip de estado, motivo, consequência em uma frase, metadados em texto e, à direita, "Parado há" com o número em Fraunces e **"Ver proposta" como botão primário**. **Atrasada ou travada em aprovação**: linha compacta de tabela (cliente, motivo, dias e prazo) com "Ver proposta" em contorno. "Nova" é um ponto amarelo de 6 px (com texto para leitor de tela); "Atribuída a..." é texto verde. Só atrasada e crítica ganham chip de estado; atenção é texto com glifo e "em dia" é texto cinza.

### Diálogo de proposta
Dois blocos separados por uma linha: **"Texto para o cliente"** (rascunho editável; "Copiar texto" é ação secundária e mostra "Copiado" inline) e **"Interno"** (responsável e "Atribuir ao setor" como ação primária; a confirmação aparece inline no próprio diálogo, com "Fechar"). Nenhuma das confirmações depende de toast.

### Célula da grade e legenda
Link que preenche a célula. **"Em dia" é só "5 d" em cinza**, sem glifo nem fundo. Atenção, atrasada e crítica mostram glifo + dias, o rótulo do estado abaixo, fundo suave + linha + texto do estado. Linhas ordenadas pelo pior estado; coluna final "Problemas" (atrasadas + críticas) e linha final com a contagem por frente. Legenda em uma linha com os 4 estados; um rodapé curto explica "Nunca" e o canto marcado. **Um glifo por estado**: círculo cheio (em dia), meio círculo (atenção), anel (atrasada), X (crítica), traço (nunca teve ação). Aprovação travada = canto marcado (triângulo) com texto para leitor de tela. Os glifos são dado, não ícone decorativo (`EstadoGlyph`, SVG mínimo em `currentColor`).

### Inputs e formulários
Campos shadcn (`Field`, `FieldGroup`) em superfície branca, borda #85847a, raio 6 px, 36 px. Erro inline abaixo do campo, `aria-invalid`, foco no primeiro erro ao enviar. Datas nativas com `max` = hoje. Busca é um campo simples, sem lupa.

### Navegação
Sidebar branca. Radar, Grade, Clientes e Check-up numa lista **só de texto**; Configurações separada embaixo; nenhum item "em breve". O ativo ganha **negrito e um marcador amarelo de 3 px** à esquerda (sem fundo). Contagens tabulares à direita. O aviso de dados fictícios aparece uma vez, no pé. Abaixo de 1024 px: botão "Menu" que abre a lista. Abas: texto, ativa com **sublinhado amarelo de 3 px**.

### Marca
`RadarMark` (anel, ponteiro e pivô em `currentColor`; setor sempre #fcbd20; prop `pequena` com traço mais grosso e sem pivô, para tamanhos até 28 px) e `RadarLogo` (marca + "Radar" em Fraunces + "WEETHUB" em Urbanist, 12 px, 70% de opacidade). Ver `docs/identidade.md`. O favicon é `src/app/icon.svg` (marca padrão); a versão pequena também existe em `public/brand/radar-mark-small.svg`.

## Movimento

Animação serve para mostrar **mudança de dado** e **entrada de tela**, nunca para enfeitar. Feita com GSAP (`gsap` + `@gsap/react`), centralizada em `src/lib/motion/`: `gsap.ts` (registro único), `tokens.ts` (durações 0,15 a 0,6 s; curvas `power2.out` e `power3.out`, nada elástico), `movimento.ts` (`gsap.matchMedia()` com `prefers-reduced-motion`), `use-entrada.ts`, `numero.tsx` (contagem), `use-flip-lista.ts` (listas) e `aparece.ts` (confirmações inline).

- **Só transform e opacidade.** Única exceção: a largura (`flex-grow`) dos segmentos da barra de saúde, porque é o dado.
- **Tudo dentro de `useGSAP` com `scope`** (ou ref de função, no caso dos diálogos); nada de GSAP durante a renderização no servidor. Sem ScrollTrigger, ScrollSmoother nem SplitText: é ferramenta de operação.
- **Com `prefers-reduced-motion: reduce` não há movimento**: o estado final aparece na hora.
- Entrada de tela: blocos marcados com `data-entra` sobem 8 px e aparecem em sequência (0,04 s).
- Painel de saúde: números contam até o novo valor (0,6 s), os segmentos da barra crescem até a proporção nova (partindo da última mostrada) e o sublinhado do indicador selecionado desliza.
- Lista do Radar, Grade, Clientes e linha do tempo da ficha: quem fica desliza para o novo lugar (FLIP), quem entra sobe e aparece, quem sai deixa um fantasma que some. Na Grade, a célula que mudou de estado pisca (opacidade, 0,6 s).
- Diálogos: opacidade + escala 0,98 a 1 (0,18 s) na abertura e no fechamento; "Copiado" e "Atribuída ao setor ..." entram com fade + 4 px.
- Sidebar: o marcador amarelo do item ativo desliza entre itens ao trocar de rota. O painel do "Menu" do celular desliza por CSS (Radix).

## Política de ícones

**Menos ícones.** Ícone só quando carrega significado que o texto não carrega.

- **Sem ícone:** sidebar, painel de saúde, abas, cabeçalhos de seção, botões de ação (Copiar, Atribuir, Salvar, Registrar ação, Atualizar radar...), campo de busca, estados vazios e de erro (título + frase + botão), toasts (o CSS esconde o ícone do sonner), breadcrumb (separador "/"), botão de menu (texto "Menu").
- **Mantidos:** o X de fechar dos diálogos; as setas e o "check" de seleção nativos do select (shadcn); e os **glifos de estado** (forma simples por estado) na grade, na legenda, nos chips de estado e no calendário nativo do navegador.
- `lucide-react` só é importado em `src/components/ui/` (X, chevrons e check do shadcn; `spinner.tsx`, `sheet.tsx` e `dropdown-menu.tsx` não são usados pelo app). Nenhum componente do app o importa.

## Do's and Don'ts

### Do:
- **Do** usar os tokens (`--primary`, `--brand`, `--state-*`) em todo componente; mudar a identidade deve exigir mexer só nos tokens.
- **Do** mostrar o motivo de cada alerta em números (dias, prazo).
- **Do** rotular tudo que a IA escreve como rascunho a revisar.
- **Do** manter "Em dia" discreto na grade.
- **Do** usar o amarelo só como fundo ou linha, e nunca no painel de saúde.
- **Do** deixar a cor para o dado: a barra de saúde e os glifos de estado são o único indicador colorido do topo do Radar.

### Don't:
- **Don't** usar roxo, azul-violeta nem neutros com matiz frio. A paleta do mockup original foi descartada.
- **Don't** usar o amarelo da marca como texto sobre claro, como cor de estado ou dentro de chip de estado.
- **Don't** usar gradiente, sombra colorida, glassmorphism, borda lateral colorida em cartões ou fileira de três cartões iguais.
- **Don't** usar cantos de cartão acima de 6 px; só botões e chips são pílula.
- **Don't** pôr selo/badge onde um texto simples resolve; **don't** usar ícone decorativo.
- **Don't** usar Fraunces fora do h1, do "Parado há" do cartão crítico e do wordmark; **don't** usar itálico fora do h1 do `/radar`; **don't** usar caixa alta fora dos botões; **don't** pôr nada abaixo de 12 px.
- **Don't** repetir a faixa de quatro números iguais em bloco escuro: o painel de saúde é claro e tem uma barra que mostra proporção.
- **Don't** mostrar valores financeiros, receita potencial ou tendências inventadas.
- **Don't** depender só de cor para comunicar estado.
