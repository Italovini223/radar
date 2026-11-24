# Product

<!-- impeccable:product-schema 1 -->

> Nota de origem: este arquivo foi escrito a partir do plano técnico aprovado da Sprint 1 e do chat do grupo SKUadrão de 13/11. Não houve rodada de entrevista interativa; as inferências estão marcadas como "a validar".

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui (base Radix), zustand com persistência em localStorage, vitest para as regras. Escolha do plano aprovado, não delegada.

## Users

- **Gestores de conta e de tráfego da Weethub** (agência de e-commerce). Abrem o Radar no início do dia para saber qual cliente está sem atenção em qual frente.
- **Líderes de setor** (Mídia paga, CRM, CRO/UX, Conteúdo, Materiais, Redação). Recebem a oportunidade atribuída ao seu setor e decidem se viram tarefa.
- Contexto: carteira com dezenas de clientes, cada um com várias frentes de serviço. Ninguém consegue lembrar de cabeça "quando foi a última vez que mexemos no Layout da Casa Nativa".

## Product Purpose

O Weethub Radar mostra, por cliente e por frente, há quantos dias nada é feito, e transforma o que está parado em oportunidades de ação. Existe porque clientes "esquecidos" (frentes contratadas ou possíveis sem movimento) são receita perdida e risco de churn. Sucesso na v1: o time abre a tela, vê as frentes paradas ordenadas por gravidade, abre um rascunho de proposta e atribui ao setor responsável, sem planilha.

## Positioning

Alerta por **regra fixa e auditável** (prazo por frente x dias desde a última ação), nunca por IA. A IA entra só como redatora de rascunho, e uma pessoa revisa antes de qualquer envio ao cliente. Modelo de dados no formato do Kalif (cliente + frente + data), para trocar a fonte depois.

## Operating Context

- Cada ação é `cliente + frente + data + status`.
- Frentes: Google Ads, Meta Ads, CRM, CRO, Layout, Conteúdo/Social, Materiais, Redação.
- Na v1 os dados entram por **check-up manual** (cerca de 5 minutos por cliente). Integrações (Kalif, Mensi, Google/Meta Ads, e-mail/WhatsApp) são versão 2, mostradas apenas como visão de futuro.
- Dados do protótipo são fictícios, com gargalos plantados de propósito em 4 clientes para provar a detecção.

## Capabilities and Constraints

- Prazos por frente iniciais (a validar com os setores): Google/Meta Ads 30 dias, CRM 15, Conteúdo/Social 30, Materiais 30, Redação 30, CRO 180, Layout 365. Editáveis em Configurações.
- Estados: em dia (< 75% do prazo), atenção (75% a 100%), atrasada (> 100%), crítica (> 150% ou nunca teve ação). Ação aguardando aprovação há mais de 7 dias gera alerta próprio.
- Sem login, sem banco, sem deploy na Sprint 1. Persistência em localStorage atrás de uma interface de repositório, para trocar por Supabase na Sprint 2.
- **LGPD / regulamento**: somente dados fictícios ou anonimizados; sem faturamento, receita, senhas, acessos ou dado pessoal. Nenhuma chave de API no código.
- Fora da v1: login e perfis, Supabase, integrações, IA real, importação de CSV, telas Atividades e Setores, qualquer dado financeiro.

## Brand Commitments

- Marca Weethub (Growth Partners). A identidade segue o guia de componentes do Radar: fundo cinza-quente `#e9e8e4`, painéis `#f3f2ef`, tinta `#1c1c1a`, amarelo `#fcbd20` só na marca, coral `#cd3b32` só na ação que resolve o alerta; Geist; botões em pílula em caixa normal; navegação em dock. O roxo `#635bdb` do mockup inicial foi descartado (denunciava "feito por IA"). Detalhes em `DESIGN.md` e `docs/identidade.md`.
- Logo do sistema: a marca do Radar (anel de 8 segmentos, o primeiro aceso em amarelo, e ponto central), do guia de componentes (`public/brand/radar-mark.svg`, `src/app/icon.svg`). O logotipo "weethub" real não é reproduzido; o texto é só escrito. Logo/identidade definitiva da agência virá do time de design; trocar só tokens quando chegar.
- Idioma: português do Brasil.

## Evidence on Hand

- Mockup de referência (não é base de código): `WhatsApp Chat - SKUadrão Weethub/00003252-index.html`, `00003253-style.css`, `00003251-app.js` e o print `00003249-PHOTO-2026-11-13-17-48-15.jpg`.
- Não existem dados reais de clientes, métricas de receita, depoimentos ou benchmarks. Não fabricar nenhum. O mapa do processo e o tempo gasto vêm da liderança e da gestão do time (segunda-feira); não inventar números.

## Product Principles

1. **A regra é visível.** Toda oportunidade mostra o motivo em números (dias parado, prazo da frente). Nada de pontuação opaca.
2. **IA escreve, pessoa decide.** Todo texto gerado carrega "Rascunho — revisar antes de enviar ao cliente".
3. **Cliente + frente + data.** Qualquer tela se reduz a esse trio; não criar conceitos paralelos.
4. **Dado fictício é rotulado.** O protótipo deixa claro que os dados são de demonstração e permite resetar.
5. **Operar antes de enfeitar.** O Radar é ferramenta de trabalho diário: escaneabilidade e consistência acima de expressão.

## Accessibility & Inclusion

- Estados nunca dependem só de cor: sempre glifo de forma própria + texto.
- Navegação por teclado até o diálogo de proposta; foco visível; contraste mínimo AA nos quatro estados.
- Sem rolagem horizontal da página em 390 px (tabelas largas rolam dentro do próprio contêiner).
