# Escopo da v1: o que o Weethub Radar faz e o que fica de fora

Entrega 3 da Sprint 1 (Campeonato Weethub de Soluções). Referência: plano técnico aprovado e decisões do chat do grupo SKUadrão de 13/11.

## O que a v1 faz

O Radar responde uma pergunta: **em qual cliente, em qual frente, não fazemos nada há tempo demais?** Cada ação é `cliente + frente + data + status`.

1. **Radar** (`/radar`): lista as oportunidades derivadas das regras, com 4 métricas calculadas (clientes monitorados, oportunidades abertas, frentes em atenção, aguardando aprovação), abas Todas / Prioritárias / Novas, busca, filtro por setor e ordenação. Os filtros ficam na URL.
2. **Grade** (`/grade`): linhas = clientes, colunas = frentes; cada célula mostra os dias desde a última ação e o estado (em dia, atenção, atrasada, crítica, nunca). Legenda e filtro por setor. Clique abre a ficha.
3. **Clientes** (`/clientes`) e **Ficha** (`/clientes/[id]`): resumo por frente, linha do tempo das ações, botão "Registrar ação", aprovar entrega e concluir ação em andamento.
4. **Check-up** (`/checkup`): formulário de cerca de 5 minutos por cliente. Informa a data aproximada da última ação por frente e uma anotação manual do resultado de Ads (estável, caindo, subindo). Salva e o Radar recalcula na hora. É o caminho de entrada de dados da v1.
5. **Configurações** (`/configuracoes`): editar o prazo (dias) de cada frente, com as faixas de estado recalculadas; resetar os dados de demonstração.
6. **Proposta** (diálogo do Radar): rascunho gerado de forma **simulada**, editável, com o aviso "Rascunho — revisar antes de enviar ao cliente". Ações: copiar texto e atribuir ao setor.

### Regras de alerta (fixas, sem IA)

Para cada par cliente x frente, `dias = hoje - última ação concluída`:

| Estado | Condição |
|---|---|
| Em dia | dias < 75% do prazo |
| Atenção | 75% a 100% do prazo |
| Atrasada | de 100% (exclusive) a 150% do prazo |
| Crítica | mais de 150% do prazo, ou nunca teve ação |

Mais: ação aguardando aprovação há mais de 7 dias gera o alerta "travada em aprovação". Oportunidade = todo par atrasada ou crítica + as travadas. Prioridade alta = crítica.

Prazos iniciais (**a validar com os setores**): Google Ads 30, Meta Ads 30, CRM 15, Conteúdo/Social 30, Materiais 30, Redação 30, CRO 180, Layout 365 dias.

### Garantias da v1

- Alerta é regra auditável; a IA (simulada) só escreve rascunho, e uma pessoa revisa.
- Dados somente fictícios. Nenhum dado de cliente real, faturamento, senha, acesso ou dado pessoal (LGPD e regulamento).
- Os dados ficam só no navegador (localStorage) atrás de uma interface de repositório.
- Modelo de dados no formato do Kalif (cliente + frente + data), para trocar a fonte depois.

## O que fica de fora da v1

| Item | Quando |
|---|---|
| Login e perfis de acesso | Sprint 2 ou 3 |
| Banco de dados (Supabase) e dados compartilhados entre pessoas | Sprint 2 |
| Publicação / deploy (Vercel) | Sprint 2 |
| Integração com Kalif e Mensi (importar ações automaticamente) | Versão 2 |
| Integração com Google Ads e Meta Ads (métricas reais) | Versão 2 |
| Alertas por e-mail e WhatsApp | Versão 2 |
| IA real (Claude API) para o rascunho | Sprint 3 |
| Importação de CSV | Versão 2 |
| Telas Atividades e Setores (aparecem desabilitadas, "em breve") | Versão 2 |
| Qualquer dado financeiro (receita potencial, faturamento) | Fora do escopo |
| Resultado de Ads influenciando o alerta (hoje é só anotação) | Versão 2 |

## Demonstração

O seed tem 5 clientes fictícios com gargalos plantados de propósito, que provam a detecção (e são o oráculo dos testes automatizados):

| Cliente | Gargalo plantado | Detecção |
|---|---|---|
| Flor de Sal | Google Ads sem ação há 40 dias (prazo 30) | Atrasada |
| Casa Nativa | Layout sem atualização há 730 dias (cerca de 2 anos) | Crítica |
| Velô Bikes | CRM sem nenhuma ação | Crítica (nunca) |
| Nossa Horta | Conteúdo/Social parado há 90 dias | Crítica |
| Aurora Pet | Tudo em dia; uma ação aguardando aprovação há 10 dias | Só o alerta de aprovação |

Observação: o plano original falava em "47 dias" para Flor de Sal e esperava "atrasada". Com prazo 30, 47 dias é 157% e cairia em crítica pela regra dos 150%. Mantivemos a regra e plantamos 40 dias (133%), o que também deixa um exemplo do estado "atrasada" no demo.

## Pendências para as próximas sprints

- Validar os prazos por frente com cada setor.
- Receber da liderança do time o formato das tarefas simuladas e converter para `src/lib/data/seed.ts`.
- Receber logo e identidade do time de design; trocar só os tokens.
- Cada integrante registra aqui a sua contribuição (item 5 do checklist da Sprint 1).

## Contribuição de cada pessoa

| Pessoa | Contribuição |
|---|---|
| Italo | Repositório e protótipo navegável |
| (demais integrantes) | a preencher |
