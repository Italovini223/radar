# Identidade visual do Weethub Radar

Fonte da verdade dos tokens: [`DESIGN.md`](../DESIGN.md) e `src/app/globals.css`. Painel visual: [`brand/board.html`](brand/board.html) (abra no navegador).

## Estratégia da marca

- **O que é:** o Radar da Weethub: mostra, por cliente e frente, o que ficou parado.
- **Para quem:** gestores de conta e líderes de setor da agência. Uso diário, em escritório.
- **Promessa:** ninguém fica esquecido. A regra é visível e auditável; a IA só rascunha.
- **Personalidade:** direta, precisa, calma. Preto e papel, com uma única luz amarela.
- **O que evitar:** roxo e brilho de "feito por IA", ícones decorativos, selos, gradientes, enfeite.
- **Frase da marca (proposta):** "Nada fica esquecido."
- **Herança:** a identidade vem do site weethub.com (preto, off-white quente, acento amarelo, Fraunces + Urbanist). O roxo do mockup original foi descartado.

## Conceito

O radar aponta para a frente do cliente que ficou parada. O **anel** é a carteira de clientes; o **setor amarelo** é a frente parada, acesa pelo varrimento; o **ponteiro** e o **pivô** são o radar em operação. O setor de 90° e o anel ecoam a roda "ACELERAÇÃO 360°" do site da Weethub, sem copiá-la.

Arquivos: `public/brand/radar-mark.svg`, `src/app/icon.svg` (favicon), `src/components/brand/radar-mark.tsx` e `radar-logo.tsx`. A marca já existia e **não deve ser redesenhada**.

## Construção geométrica

Grade de 48 x 48 (viewBox), centro em (24, 24).

| Elemento | Medida |
|---|---|
| Anel | círculo de raio **17**, traço **10** (borda externa r=22, interna r=12), cor `currentColor` (tinta) |
| Setor | **90°**, do alto (12h) até a direita (3h), cobrindo a faixa do anel (r 12 a 22), amarelo `#fcbd20` |
| Ponteiro | linha do centro a **45°** (para nordeste), comprimento ~10,6, traço 2,6, ponta redonda, `currentColor` |
| Pivô | círculo de raio **3,4** no centro, `currentColor` |

O setor cobre o canto nordeste do anel; o ponteiro aponta para dentro dele.

## Paleta

| Papel | Hex | Uso |
|---|---|---|
| Tinta | `#0a0a0a` | texto, botão primário, anel e ponteiro da marca, foco |
| Amarelo Weethub | `#fcbd20` | **acento raro**: setor da marca, sublinhado da aba ativa, marcador do item ativo, ponto de "Nova". Nunca texto sobre claro e fora do painel de saúde |
| Canvas | `#fffff7` | fundo da página (off-white quente do site) |
| Superfície | `#ffffff` | cartões, tabelas, campos |
| Superfície quieta | `#f4f3ea` | hover, KPI selecionado |
| Linha | `#e7e7e7` | bordas hairline (campos: `#85847a`, 3,8:1) |
| Tinta suave | `#5b5b53` | texto secundário (AA: 6,8:1 no canvas) |

Estados (texto / fundo / linha): em dia `#1d6a3b / #e8f2e6 / #bcd9b8`; atenção `#7a4a06 / #f5e8cc / #e0c58b`; atrasada `#a3410d / #fbe6d6 / #efbf9d`; crítica `#a8221a / #fbe4e1 / #efb4ae`. O amarelo da marca nunca é cor de estado.

## Tipografia

- **Fraunces** (serifa): h1 de página, o "Parado há" do cartão crítico e o wordmark "Radar". O itálico ("Radar de *clientes*") existe só no h1 do `/radar`.
- **Urbanist** (sans): todo o resto. Corpo a partir de 15 px, nada abaixo de 12 px; caixa alta com tracking **só** nos botões (e no "WEETHUB" do lockup).

## Regras de uso

- Anel, ponteiro e pivô em tinta (`#0a0a0a`) sobre claro ou off-white (`#fffff7`) sobre preto; o setor é sempre `#fcbd20`, em qualquer fundo.
- Lockup: marca + "Radar" (Fraunces 600) + "WEETHUB" (Urbanist, 12 px, caixa alta com tracking, 70% de opacidade). O texto "Weethub" é só escrito; **não** reproduzir nem imitar o logotipo "weethub" real.
- Marca isolada quando houver pouco espaço (barra superior do celular, favicon).
- **Versão pequena** (`pequena` no `RadarMark`, `public/brand/radar-mark-small.svg`): traço do anel mais grosso (3,6) e sem pivô, para tamanhos até 28 px, onde o pivô de 3,4 vira um borrão. O favicon continua a marca padrão.
- **Área de proteção:** margem livre de pelo menos o raio do pivô multiplicado por 3 (≈ 10 unidades da grade de 48, ou 1/5 da largura da marca) em todos os lados. **Tamanho mínimo:** 16 px de largura na tela.
- Não girar, não esticar, não trocar o amarelo, não pôr contorno, sombra, gradiente ou efeito. Não usar a marca sobre amarelo.
- Poucos ícones no produto (ver "Política de ícones" no `DESIGN.md`).
