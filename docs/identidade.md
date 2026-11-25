# Identidade visual do Weethub Radar

Fonte da verdade dos tokens: [`DESIGN.md`](../DESIGN.md) e `src/app/globals.css`. Painel visual: [`brand/board.html`](brand/board.html) (abra no navegador).

## Estratégia da marca

- **O que é:** o Radar da Weethub: mostra, por cliente e frente, o que ficou parado.
- **Para quem:** gestores de conta e líderes de setor da agência. Uso diário, em escritório.
- **Promessa:** ninguém fica esquecido. A regra é visível e auditável; a IA só rascunha.
- **Personalidade:** direta, precisa, calma. Cinza-quente e tinta, coral só no que pede ação, amarelo só na marca.
- **O que evitar:** roxo e brilho de "feito por IA", ícones decorativos, selos, enfeite. Degradê só nos gráficos e no radar previstos no guia.
- **Frase da marca (proposta):** "Nada fica esquecido."
- **Herança:** a primeira identidade veio do site weethub.com (preto, off-white, acento amarelo). A atual segue o guia de componentes do Radar (Geist, fundo cinza-quente, pílulas, dock).

## Conceito

O radar observa a carteira inteira. O **anel de 8 segmentos** são as frentes de trabalho; o **segmento aceso em amarelo** é a frente parada, que o radar encontrou; o **ponto central** é o observador. A mesma divisão em segmentos aparece no radar da tela inicial (um segmento por frente).

Arquivos: `public/brand/radar-mark.svg` (fundo claro), `public/brand/radar-mark-small.svg` (fundo escuro), `src/app/icon.svg` (favicon) e `src/components/brand/radar-mark.tsx` (prop `tom`: `claro` ou `escuro`).

## Construção geométrica

Grade de 48 x 48 (viewBox), centro em (24, 24).

| Elemento | Medida |
|---|---|
| Anel | 8 segmentos de anel entre r=13,5 e r=22, com ~2,6° de intervalo entre eles |
| Segmento aceso | o primeiro, do topo (12h) para a direita, sempre amarelo `#fcbd20` |
| Demais segmentos | `#c4c2ba` sobre claro; `#4a4945` sobre tinta |
| Centro | círculo de raio **3,2**: tinta `#1c1c1a` sobre claro; `#f3f2ef` sobre tinta |

## Paleta

A paleta completa (com papéis e contrastes) está no `DESIGN.md`. Resumo:

| Papel | Hex | Uso |
|---|---|---|
| Fundo | `#e9e8e4` | página |
| Painel | `#f3f2ef` | cartões, tabelas, dock |
| Pílula | `#e3e2dd` | botões cinza, pílulas |
| Tinta | `#1c1c1a` | texto, ação de sistema, item ativo |
| Tinta 2 | `#66655f` | texto secundário, legendas |
| Amarelo Weethub | `#fcbd20` | segmento aceso da marca, marcador de "Perto do prazo", ponto de "Nova" |
| Coral | `#ff5a52` / `#cd3b32` | marcador de crítica / botão que resolve o alerta |
| Laranja | `#ffa64d` | marcador de atrasada |

## Tipografia

- **Geist** em todo o UI, pesos 300 (números grandes), 400 (texto e títulos) e 500 (ênfase, botões, status). Corpo de 13 px, legendas de 11 px. Sem caixa alta.

## Regras de uso

- O segmento aceso é sempre `#fcbd20`, em qualquer fundo. Os demais segmentos e o centro trocam de tom conforme o fundo (claro ou tinta).
- Sem lockup com texto: no produto, a marca aparece sozinha (cabeçalho, dock, favicon). O texto "Weethub" é só escrito; **não** reproduzir nem imitar o logotipo "weethub" real.
- **Área de proteção:** pelo menos 1/5 da largura da marca em todos os lados. **Tamanho mínimo:** 16 px de largura na tela.
- Não girar, não esticar, não trocar o amarelo, não pôr contorno, sombra, gradiente ou efeito. Não usar a marca sobre amarelo.
- Poucos ícones no produto (ver "Política de ícones" no `DESIGN.md`).
