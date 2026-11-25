---
name: Weethub Radar
description: Ferramenta de operação diária da agência Weethub para ver, por cliente e frente, o que está parado. Painéis claros sobre fundo cinza-quente, Geist, botões em pílula, navegação em dock flutuante, coral para a ação que resolve o alerta e amarelo Weethub só na marca. Modo claro, densidade média.
colors:
  bg: "#e9e8e4"
  panel: "#f3f2ef"
  panel-hi: "#fbfaf8"
  pill: "#e3e2dd"
  line: "#dcdbd5"
  ink: "#1c1c1a"
  ink-2: "#66655f"
  ink-3: "#8a8984"
  on-ink: "#fbfaf8"
  brand: "#fcbd20"
  glow: "rgba(240, 232, 70, 0.8)"
  orange: "#ffa64d"
  orange-soft: "#ffe2c2"
  coral: "#ff5a52"
  coral-strong: "#cd3b32"
  coral-soft: "#ffe1de"
  crit-text: "#c4382f"
  late-text: "#a35a00"
  warn-text: "#8a6200"
  ok: "#2a7d40"
  dot-idle: "#c9c8c2"
typography:
  family: "Geist, Helvetica Neue, Arial, sans-serif"
  page-title: { fontSize: "28px", fontWeight: 400, letterSpacing: "-0.02em" }
  panel-title: { fontSize: "17px", lineHeight: "22px", fontWeight: 400 }
  emphasis: { fontSize: "15px", lineHeight: "20px", fontWeight: 500 }
  body: { fontSize: "13px", lineHeight: "18px", fontWeight: 400 }
  small: { fontSize: "12px", fontWeight: 400 }
  caption: { fontSize: "11px", lineHeight: "14px", fontWeight: 400, color: "ink-2" }
  stat: { fontSize: "34px", lineHeight: "36px", fontWeight: 300, letterSpacing: "-0.02em" }
rounded:
  sm: "10px (controles, item selecionado)"
  md: "18px (painéis)"
  lg: "28px (moldura, diálogos)"
  full: "999px (botões, pílulas, dock, campos)"
shadow:
  panel: "nenhuma"
  dock: "0 6px 24px rgb(28 28 26 / .08)"
  pop: "0 12px 40px rgb(28 28 26 / .14)"
spacing: { s-1: "4px", s-2: "8px", s-3: "12px", s-4: "16px", s-5: "20px", s-6: "28px" }
---

# Design System: Weethub Radar

> **Origem.** Esta versão segue o guia de componentes do Radar (`weethub-radar-componentes.html`, guia de identidade visual): fundo cinza-quente, painéis claros sem sombra, Geist, pílulas, dock flutuante embaixo, status em texto com marcador e coral para resolver o alerta. Substitui o "painel SaaS" anterior (Nunito Sans, azul de ação, trilho de ícones, cartões brancos com sombra). Todos os valores vivem em `src/app/globals.css`; os componentes só usam tokens.

## Overview

O Radar é uma mesa de triagem: o time abre, vê o que pede ação e despacha. O visual é calmo e plano: painéis um tom acima do fundo, quase nenhuma borda, tipografia leve e cor só onde há alerta.

**Key Characteristics:**
- **Tinta** (`--ink`) é a ação de sistema: "Recalcular alertas", item ativo da dock, aba ativa, foco.
- **Coral** (`--coral-strong`, variante `resolver` do botão) é a ação que resolve o alerta: "Ver proposta". **Uma vez por tela**, no alerta mais urgente.
- **Cinza** (`--pill`) é todo o resto: botões secundários, pílulas, botões da dock.
- **Amarelo Weethub** (`--brand`) é marca: o segmento aceso do logo, o marcador de "Perto do prazo" e o ponto de "Nova". Nunca texto, nunca fundo de botão.
- Status sempre como **texto colorido + marcador** (triângulo ou bolinha), sem chip, sem fundo, sem borda.
- Uma família só (Geist) em pesos 300, 400 e 500. Números sempre tabulares.

## Colors

### Superfícies e tinta
- **Fundo** `#e9e8e4` (página). **Painel** `#f3f2ef` (cartões, tabelas, dock). **Painel claro** `#fbfaf8` (diálogos, campos, hover, linha selecionada). **Pílula** `#e3e2dd` (botões cinza, pílulas, contadores). **Linha** `#dcdbd5` (divisores).
- **Tinta** `#1c1c1a` (texto e ação de sistema; 15,3:1 no painel). **Tinta 2** `#66655f` (texto secundário e legendas; 5,2:1 no painel, 4,8:1 no fundo). **Tinta 3** `#8a8984` (3,1:1): só borda de campo, eixos e marcações; **nunca texto**.
- No `globals.css`, os papéis do shadcn apontam para essas primitivas: `background`=fundo, `card`=painel, `popover`/`accent`=painel claro, `muted`/`secondary`=pílula, `border`=linha, `input`=tinta 3, `primary`/`ring`/`link`=tinta, `resolver`=coral-strong.

### Coral (resolver)
- `#cd3b32` com texto `#fbfaf8` (4,7:1), hover `#b8332b`. O guia traz `#d63c34`, que dá 4,4:1 com o texto claro do botão; foi escurecido para passar AA.

### Estados (texto / marcador / fundo suave)
O texto passa 4,5:1 sobre o painel e o painel claro. Use status sobre painéis, não direto no fundo da página.
- **Crítica** `#c4382f` / coral `#ff5a52` / `#ffe1de` (também o destrutivo)
- **Atrasada** `#a35a00` / laranja `#ffa64d` / `#ffe2c2`
- **Perto do prazo** (identificador interno `atencao`) `#8a6200` / amarelo `#fcbd20` / `#fcefc9`
- **Em dia** tinta 2 `#66655f` / cinza `#c9c8c2`
- **Sucesso** (confirmações, "Atribuída a…") `#2a7d40` / `#e3efe4`

**A Regra do Marcador.** Triângulo = já estourou o prazo (crítica em coral, atrasada em laranja, "nunca teve ação" em coral). Bolinha = ainda não estourou (perto do prazo em amarelo, em dia em cinza). É o mesmo marcador do radar, então a lista e o radar falam a mesma língua.
**A Regra do Estado Completo.** Cor de estado sempre vem com marcador e rótulo.

**Vocabulário: rótulo visível x identificador interno.** Há dois níveis, e a tela os mantém separados. **Frente** (par cliente × frente): *Em dia · Perto do prazo · Atrasada · Crítica* (+ "Nunca"). **Cliente**: *Crítico · Atenção · Ok*. O identificador interno `EstadoFrente = "atencao"` não foi renomeado; só o rótulo visível ("Perto do prazo", em `ROTULO_ESTADO_FRENTE`, `src/lib/domain/rotulos.ts`). "Atenção" é só a situação do cliente. Na ficha, a nota de saúde usa Boa · Regular · Crítica para não conflitar.

## Typography

**Geist** via `next/font/google` (`--font-geist`), em todo o UI. Escala: 11 · 12 · 13 · 15 · 17 · 20 · 28 · 34.

- **Título de página (h1)**: 28px, 400, tracking -0,02em.
- **Título de painel** ("Saúde da carteira", "Fila de hoje"): 17px/22px, 400.
- **Destaque** (nome do cliente no cartão, motivo do alerta): 15px, 500.
- **Corpo**: 13px/18px, 400. Botões: 13px, 500, **caixa normal**.
- **Legenda** (`.legenda`): 11px/14px, tinta 2, caixa normal. Substitui os antigos overlines em caixa alta ("Parado há", cabeçalhos de tabela).
- **Número** (`.numero`): peso 300, tabular, tracking -0,02em; 34px nos indicadores, 28px no cartão crítico. A unidade vai num `<small>` de 12px em tinta 2 ("90 <small>dias</small>").
- Pesos: só 300 (números), 400 (texto e títulos) e 500 (ênfase, botões, status). Sem 600+.
- **Sem caixa alta** no UI.

## Layout

- **Cabeçalho** (64px, sobre o fundo, sem barra branca): marca, nome da seção em 17px (ou o caminho Clientes › Cliente), à direita a pílula "Dados de demonstração" e o botão redondo de Configurações.
- **Dock** (navegação): barra flutuante centralizada a 16–20px do rodapé, fundo painel, `shadow-dock`, raio total. Botões redondos de 40px em pílula; o ativo em tinta com ícone claro (o Radar usa a própria marca, versão escura quando ativo). Contador coral (texto em tinta) com o número de clientes com alerta sobre Clientes (sem alerta, sem contador; o Radar não tem contador). O último botão recalcula os alertas, com "Atualizado / hoje, 09:12" (ou a data de referência) ao lado a partir de 640px. **Ordem: Radar, Grade, Clientes, Check-up, Recalcular.** Não há sidebar nem menu lateral no celular: a dock cabe em 375px.
- **Conteúdo**: largura máxima 1320px, margens 16/32/40px, 112px livres embaixo para a dock.

## Elevation & Shapes

- Painéis: fundo painel, raio 18px, **sem borda e sem sombra**. Padding 20px.
- Diálogos: painel claro, raio 28px, `shadow-pop`, véu tinta a 40%.
- Só o que flutua tem sombra (dock, diálogos, menus).
- Botões, campos, selects, pílulas, abas e dock: `rounded-full`. Itens de menu, linha selecionada e células da grade: 10px.

## Components

### Botões
Pílula de 40px (`sm` 32px), padding 22px, 13px/500, caixa normal.
- **`resolver`** (coral): "Ver proposta" no alerta mais urgente da tela. Um por tela.
- **`default`** (tinta): ação de sistema ("Recalcular alertas", "Salvar", "Atribuir ao setor").
- **`outline` / `secondary`** (cinza): todo o resto ("Registrar ação", "Ficha", "Cancelar").
- **`ghost`**: texto tinta 2, hover pílula. **`destructive`**: pílula com texto de crítica.
- **`link`**: texto sublinhado ("Ver tudo").

### Status (`EstadoBadge`, `SituacaoBadge`, `EstadoGlyph`)
Texto 12px/500 na cor do estado + marcador (triângulo de 9px ou bolinha de 7px). Sem fundo e sem borda. "Em dia" em tinta 2.

### Pílula (`Badge variant="secondary"`)
26px, fundo pílula, 12px em tinta 2, número em `<b>` 500 tinta ("**10** clientes"). Resume a carteira; não é clicável e não leva cor de status.

### Números (indicadores do painel de saúde)
Legenda com marcador em cima, número 34px/300 e uma linha curta embaixo. Só o número de críticas ganha cor. Selecionado = fundo painel claro + sublinhado de 2px na cor do estado.

### Barra de saúde
Conta **clientes**, não pares cliente × frente: título "6 de 10 clientes precisam de ação" (Crítico + Atenção) e três segmentos arredondados de 10px (Crítico em coral, Atenção em laranja, Ok em cinza), com 4px de intervalo; legenda com marcador, contagem e %. Os indicadores abaixo contam frentes e dizem "em N clientes".

### Alertas por frente
Barras horizontais de 10px, uma por frente, com crítica (coral) e atrasada (laranja) empilhadas e o total à direita, da frente com mais alertas para a com menos; frentes sem alerta numa linha ao fim. É a mesma conta da linha "Problemas" da Grade (`alertasPorFrente`: atrasadas + críticas, sem aprovação travada). Ao lado da Saúde da carteira a partir de 1280px.

### Grade
Tabela cliente × frente com os dias desde a última ação. **Sem células coloridas**: o número muda de cor e ganha marcador só quando há alerta. Embaixo dos números que ainda não estouraram o prazo, uma barrinha de 44×2px mostra quanto do prazo já foi usado; acima de 70% ela fica amarela. Aprovação travada = canto amarelo. Frente que o cliente não contratou = "—" cinza, sem link, fora das contagens. CRO sem nenhuma ação concluída = "sem histórico" em cinza (sem marcador nem barra, clicável, informativo: não é "nunca" e não conta em Problemas). A coluna Cliente é fixa ao rolar para o lado, com sombra sutil na borda quando há rolagem (no celular o nome é truncado). A legenda explica a leitura da célula (estados, "Em dia mostra só os dias", "Nunca", "—", canto marcado); o rodapé só explica "Problemas". Cabeçalho em 12px tinta 2, prazo em legenda.

### Cartão de oportunidade
**Crítica**: painel com nome (15px/500), status, motivo, consequência e metadados; à direita a legenda "Parado há", o número 28px/300 em texto de crítica, o prazo e as ações. **Atrasada / travada**: linha compacta dentro de um painel-lista, ações cinza. "Nova" = ponto amarelo de 6px (+ texto para leitor de tela).

### Abas
Texto 13px/500 tinta 2; ativa em tinta com sublinhado de 2px; contador em pílula (ativa: tinta com texto claro).

### Campos
Painel claro, borda tinta 3 (3,1:1), `rounded-full` e 40px (textarea: 10px). Foco com contorno de 2px em tinta.

### Previstos no guia, ainda não implementados
O guia também define o **radar circular** (anel externo com marcações a cada 4°, anel laranja segmentado por frente, halo `glow`, miolo com círculo coral da zona crítica e varredura de 7s), o **painel do cliente** com teia das 8 frentes (degradê coral → amarelo), a **fila de alertas** e os **gráficos** em barras com degradê ("Alertas por status", "Alertas por frente"), compostos na tela inicial de três colunas. Os tokens (`--glow`, `--orange-soft`, `--coral-soft`) já estão no `globals.css`; a tela vem numa próxima entrega.

## Movimento

Animação serve para mostrar **mudança de dado** e **entrada de tela**, nunca para enfeitar. Feita com GSAP (`gsap` + `@gsap/react`), centralizada em `src/lib/motion/`: `gsap.ts` (registro único), `tokens.ts` (durações 0,15 a 0,6 s; curvas `power2.out` e `power3.out`, nada elástico), `movimento.ts` (`gsap.matchMedia()` com `prefers-reduced-motion`), `use-entrada.ts`, `numero.tsx` (contagem), `use-flip-lista.ts` (listas) e `aparece.ts` (confirmações inline).

- **Só transform e opacidade.** Única exceção: a largura (`flex-grow`) dos segmentos da barra de saúde, porque é o dado.
- **Tudo dentro de `useGSAP` com `scope`** (ou ref de função, no caso dos diálogos); nada de GSAP durante a renderização no servidor. Sem ScrollTrigger, ScrollSmoother nem SplitText: é ferramenta de operação.
- **Com `prefers-reduced-motion: reduce` não há movimento**: o estado final aparece na hora.
- Entrada de tela: blocos marcados com `data-entra` sobem 8 px e aparecem em sequência (0,04 s).
- Painel de saúde: números contam até o novo valor (0,6 s), os segmentos da barra crescem até a proporção nova (partindo da última mostrada) e o sublinhado do indicador selecionado desliza.
- Lista do Radar, Grade, Clientes e linha do tempo da ficha: quem fica desliza para o novo lugar (FLIP), quem entra sobe e aparece, quem sai deixa um fantasma que some. Na Grade, a célula que mudou de estado pisca (opacidade, 0,6 s).
- Diálogos: opacidade + escala 0,98 a 1 (0,18 s) na abertura e no fechamento; "Copiado" e "Atribuída ao setor ..." entram com fade + 4 px.

## Política de ícones

- Ícones `lucide-react` com traço 1,6 **só na navegação** (dock e botão de Configurações) e no caminho do cabeçalho (chevron).
- Botões de ação, abas e cabeçalhos continuam só com texto.
- Marcadores de estado não são ícones: são dado (`EstadoGlyph`).

## Do's and Don'ts

### Do
- **Do** usar só tokens (`bg-panel`, `bg-pill`, `text-ink-2`, `bg-resolver`, `--state-*`).
- **Do** manter o conteúdo em painéis planos sobre o fundo cinza-quente.
- **Do** mostrar o motivo de cada alerta em números (dias, prazo).
- **Do** manter "Em dia" discreto (cinza, bolinha).

### Don't
- **Don't** usar o coral mais de uma vez por tela, nem para ação de sistema.
- **Don't** usar o amarelo como texto, fundo de botão ou cor de ação.
- **Don't** usar tinta 3 (`#8a8984`) em texto.
- **Don't** usar caixa alta, pesos acima de 500, sombras em painéis, bordas fortes ou células coloridas.
- **Don't** depender só de cor para comunicar estado.
