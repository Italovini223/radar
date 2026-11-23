# TESTE-001: gabarito da demonstração (Radar, Sprint 2)

Modelo de teste manual. Os campos marcados com **(preencher)** ficam em branco para a pessoa da frente de teste. Não preencha o que não foi executado.

## Identificação

| Campo | Valor |
|---|---|
| Quem testou | **(preencher)** |
| Data do teste | **(preencher)** |
| Ambiente (URL testada) | **(preencher)** |
| Versão / commit | **(preencher)** (visível em `git log -1` ou no deploy) |
| Dispositivo e navegador | **(preencher)** |

## Pré-condições

- O app abre sem login na URL acima e o banco está configurado (se aparecer "Banco de dados não configurado", pare e avise o desenvolvimento).
- "Hoje" da demonstração é **13 nov. 2026** (data de referência). O gabarito só vale nessa data: confirme que o subtítulo do Radar mostra "Data de referência: 13 nov. 2026 (demonstração)" e que Configurações está com "Data de referência" selecionada (não "Hoje real").

## Passos e resultado esperado

| # | Passo | Resultado esperado | Resultado obtido | Passou? |
|---|---|---|---|---|
| 1 | Carregar a demonstração: com o banco vazio, clicar em "Carregar dados de demonstração" e confirmar; com dados, ir em Configurações > "Resetar dados de demonstração" e confirmar | Radar mostra **9 oportunidades**; Clientes lista **10 clientes ativos** | (preencher) | (preencher) |
| 2 | Abrir **Clientes** e conferir a situação de cada um dos 10 clientes | Aurora Moda = **Crítico**; Ninho Casa & Decor = **Crítico**; Raiz Orgânicos = **Crítico**; Patas Pet Store = **Atenção**; Vitta Suplementos = **Atenção**; Bella Pele Cosméticos = **Atenção**; TechMania = **Ok**; Doce Lar Utilidades = **Ok**; Mundo Kids Brinquedos = **Ok**; Lumi Acessórios = **Ok** (3 críticos, 3 atenção, 4 ok) | (preencher) | (preencher) |
| 3 | Aurora Moda: abrir a ficha e conferir os alertas | Google Ads **69 dias, crítica**; CRM / Automações **85 dias, atrasada**; Meta Ads com **2 itens aguardando aprovação há 9 dias** ("Aprovação travada"). Frente CRO não aparece (não contratada) | (preencher) | (preencher) |
| 4 | Ninho Casa & Decor: abrir a ficha | CRM / Automações **156 dias, crítica**; CRO / Melhorias do site **cerca de 13 meses (389 dias), crítica** | (preencher) | (preencher) |
| 5 | Patas Pet Store: abrir a ficha | Só Google Ads **54 dias, atrasada**. O item aguardando aprovação há **4 dias NÃO** gera alerta | (preencher) | (preencher) |
| 6 | Vitta Suplementos: abrir a ficha | Só Social / Conteúdo **24 dias (prazo 14), atrasada** | (preencher) | (preencher) |
| 7 | Bella Pele Cosméticos: abrir a ficha | **3 peças** de Produção de materiais aguardando aprovação há **6 dias**: "Aprovação travada" (um alerta de aprovação) | (preencher) | (preencher) |
| 8 | Raiz Orgânicos: abrir a ficha | Bloco "Loja em criação": "Sem retorno do cliente há **66 dias** · faltam **24 dias** para o bloqueio contratual (90 dias)". Estado Crítica; 2 follow-ups concluídos não reiniciam a contagem. No Radar o cartão diz "Sem retorno do cliente há" (não "Parado há") e "bloqueio em 24 dias" | (preencher) | (preencher) |
| 9 | Conferir que **TechMania, Doce Lar Utilidades, Mundo Kids Brinquedos e Lumi Acessórios não alertam**: nenhum deles aparece no Radar (use a busca por nome) | Nenhuma oportunidade para os quatro. **Mundo Kids** mostra só avisos "perto do prazo" (Redação 27 de 30 dias; CRO ~165 de 180 dias) na Grade/Clientes ("2 perto do prazo"), sem alerta. **Lumi** (loja em criação) tem 1 item aguardando há 1 dia e está tudo ok | (preencher) | (preencher) |
| 10 | Tarefa principal, parte 1: no Radar, no cartão da Aurora Moda / Google Ads clicar em "Registrar ação" (ou abrir a ficha > "Registrar ação"). Conferir que cliente e frente vêm preenchidos, o título sugerido é "Otimização de Google Ads feita hoje", status Concluída e data 13/11/2026. Registrar | Aparece a confirmação persistente **"Alerta resolvido: Google Ads de Aurora Moda"** e a **"Próxima oportunidade sugerida: CRM / Automações"** (85 dias), com os botões "Ver proposta" e "Abrir ficha" | (preencher) | (preencher) |
| 11 | Tarefa principal, parte 2: voltar ao Radar | O alerta Google Ads da Aurora **sumiu**; oportunidades **9 → 8**; Críticas **4 → 3**; a Aurora passa a **Atenção** em Clientes | (preencher) | (preencher) |
| 12 | Registrar uma ação com status "Aguardando aprovação" em uma frente em alerta (ex.: Ninho, CRM) | A confirmação diz que o alerta **continua** ("Ação registrada, mas o alerta de ... continua") e explica que só ação concluída resolve | (preencher) | (preencher) |
| 13 | Teste de persistência: com as ações dos passos 10 a 12 feitas, **fechar o navegador** (ou a aba), reabrir a URL e conferir o Radar. Se possível, abrir também em **outro dispositivo** | O estado permanece: continuam 8 oportunidades (ou o número do passo 12), o alerta da Aurora/Google Ads continua resolvido e a ação aparece na linha do tempo da Aurora | (preencher) | (preencher) |
| 14 | (Opcional) Configurações: mudar o limite de aprovação para 10 e voltar a 5 | Com 10, os alertas de aprovação (Aurora/Meta Ads e Bella Pele) somem; com 5 voltam | (preencher) | (preencher) |
| 15 | Ao terminar, voltar a deixar a demonstração no estado inicial: Configurações > "Resetar dados de demonstração" | Radar volta a 9 oportunidades | (preencher) | (preencher) |

## O que travou

**(preencher)**: descreva qualquer passo que não funcionou, mensagem de erro e como reproduzir.

## Prints

Salve os prints em `docs/testes/prints/` (um por passo, nome `TESTE-001-passo-NN.png`) e liste aqui:

**(preencher)**

## Resultado geral

**(preencher)**: aprovado / reprovado / aprovado com ressalvas.
