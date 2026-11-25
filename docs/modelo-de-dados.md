# Modelo de dados (Sprint 2)

Formato inspirado no Kalif: **cliente + frente + data** (+ status). Tipos em `src/lib/domain/types.ts`. Tudo que é "oportunidade" é **derivado**, nunca guardado. Os dados ficam no **Supabase**, acessados **só pelo servidor** (route handlers do Next, chave de serviço); o navegador só fala com `/api/radar`.

## Tabelas (schema `public`; RLS ligado, sem políticas)

Todos os ids são `text`. As datas são `date` (`yyyy-MM-dd`).

| Tabela | Colunas |
|---|---|
| `clientes` | `id`, `nome`, `nicho`, `tipo` (`operacao` \| `loja_em_criacao`), `responsavel` (vazio no dataset da planilha, que só traz responsável por tarefa; a tela esconde o campo quando vazio), `ativo` |
| `frentes` | `id`, `nome`, `setor`, `prazo_dias`, `critico_apos_dias`, `ordem` |
| `cliente_frentes` | `cliente_id`, `frente_id` (chave composta): frentes **contratadas** |
| `acoes` | `id`, `cliente_id`, `frente_id`, `titulo`, `status` (`concluida` \| `em_andamento` \| `aguardando_aprovacao`), `responsavel`, `criada_em`, `concluida_em`, `data`, `aguardando_desde`, `origem` (`seed` \| `manual` \| `checkup` \| `planilha`) |
| `checkups` | `id`, `cliente_id`, `data`, `resultado_ads` (`estavel` \| `caindo` \| `subindo`, anotação manual que não entra nas regras) |
| `atribuicoes` | `oportunidade_id` (chave), `setor`, `data`, `texto` |
| `configuracoes` | `id` = 1, `limite_aprovacao_dias` (5), `bloqueio_contratual_dias` (90), `data_referencia` (2026-11-13), `usar_hoje_real` (false) |

Check do banco: `aguardando_aprovacao` exige `aguardando_desde`. O mapeamento linhas <-> domínio está em `src/lib/server/mapeamento.ts`.

## Entidades do domínio

- **Client**: `id`, `nome`, `nicho`, `tipo`, `responsavel`, `ativo` (inativos saem da grade e do Radar).
- **Frente**: `id` (dataset atual: `google-ads`, `meta-ads`, `crm`, `comunicacao-site`, `desenvolvimento`, `cro`; a fixture de testes ainda usa `conteudo`, `materiais` e `redacao`), `nome`, `setor`, `prazoDias`, `criticoAposDias`.
- **Contrato**: `{ clientId, frenteId }`. Ausente no snapshot = todas as frentes contratadas.
- **Acao**: `titulo`, `data`, `status`, `aguardandoDesde?`, `origem?`, `responsavel?`, `criadaEm?`, `concluidaEm?`. Só `concluida` zera o contador da frente.
- **Configuracao**: `limiteAprovacaoDias`, `bloqueioContratualDias`, `dataReferencia`, `usarHojeReal`. `agoraDaConfiguracao(config, hojeReal)` calcula o "hoje" do app.
- **Derivados** (não persistidos): `StatusFrente` (`montarGrade`: `estado`, `dias`, `nunca`, `semHistorico`, `travada`, `relogio`, `diasParaBloqueio`), `Opportunity` (`derivarOportunidades`: id `parada:<cliente>:<frente>` ou `aprovacao:<cliente>:<frente>`, `severidade`, `motivo`, `diasParado`, `diasParaBloqueio`), `SituacaoCliente` (`situacaoDoCliente`), `proximaOportunidade`, `resumoPosAcao`.

## Regras

Em `src/lib/domain/rules.ts` (funções puras; "hoje" é sempre parâmetro):

| Regra | Valor |
|---|---|
| Perto do prazo (id. interno `atencao`) | dias >= 75% do prazo e <= prazo: aviso, **não** alerta |
| Atrasada | dias > prazo |
| Crítica | dias >= `criticoAposDias`, ou nunca teve ação |
| Sem histórico (`semHistorico`) | frente de `FRENTES_SEM_HISTORICO_INFORMATIVO` (hoje só `cro`) sem nenhuma ação concluída: informativo, em dia, **não** é "nunca", sem alerta nem oportunidade, fora de "Problemas". Dívida: virar coluna da tabela `frentes` |
| Alerta | par atrasado ou crítico + par com aprovação travada (cada um é uma oportunidade) |
| Aprovação travada | aguardando há **mais** de `limiteAprovacaoDias` dias |
| Loja em criação (cliente `loja_em_criacao` x frente `desenvolvimento`) | relógio = dias desde a ação aguardando **mais antiga**; atrasada > 30, crítica >= 60; `diasParaBloqueio = bloqueioContratualDias - dias` (<= 0 = bloqueado); a regra de aprovação travada não se aplica |
| Situação do cliente | Crítico: alguma frente crítica **ou 2+ alertas**. Atenção: 1 alerta. Ok: 0 alertas (perto do prazo e sem histórico não contam) |
| Próxima oportunidade | crítica > atrasada > aprovação travada; empate pelo maior número de dias parado |
| "Nova" | venceu o prazo há até 14 dias |

Prazos da planilha (prazo / vira crítico após): Google Ads 30/60, Meta Ads 15/30, CRM/Automações 60/120, Comunicação do site 14/28, Desenvolvimento · loja em criação 30/60, CRO/Melhorias do site 180/360.

## API (`src/app/api/radar/...`)

Resposta de sucesso `{ ok: true, dados }`; erro `{ ok: false, erro: { codigo, mensagem, campos? } }`. Nunca cacheada. Entrada validada com zod (`src/lib/server/schemas.ts`).

| Método e rota | O que faz |
|---|---|
| `GET /api/radar` | snapshot completo |
| `POST /api/radar/acoes` | registra ação (404 cliente/frente inexistente, 422 frente não contratada, 409 id repetido) |
| `PATCH /api/radar/acoes/[id]` | muda o status |
| `POST /api/radar/checkups` | salva check-up e corrige o histórico (data mais antiga remove as concluídas posteriores) |
| `PUT /api/radar/frentes/[id]` | `prazoDias` e/ou `criticoAposDias` (crítico > prazo) |
| `POST /api/radar/atribuicoes` | atribui (ou reatribui) uma oportunidade a um setor |
| `PUT /api/radar/configuracao` | limites e data de referência |
| `POST /api/radar/importar` | substitui o conteúdo por um dataset (`clients`, `frentes`, `contratos?`, `acoes`, `checkups`, `atribuicoes`, `configuracao?`) |
| `POST /api/radar/resetar` | reimporta o dataset de demonstração (a planilha: 10 clientes, 6 frentes, 166 ações) |

Códigos: 400 `ENTRADA_INVALIDA` / `JSON_INVALIDO`, 404 `NAO_ENCONTRADO`, 409 `CONFLITO`, 413 `CORPO_GRANDE_DEMAIS`, 422 `REGRA_INVALIDA`, 503 `BANCO_NAO_CONFIGURADO`, 500 `ERRO_INTERNO` (genérico; o detalhe só vai para o log do servidor).

O supabase-js não tem transação: `importarDataset` valida antes, guarda cópia do conteúdo, regrava e restaura a cópia se falhar; o check-up insere, remove e então registra o check-up.

## Cliente (navegador)

`src/lib/store.ts` (zustand) é **otimista**: aplica a mudança na hora, grava em fila pela interface `RadarRepository` (`src/lib/data/repository.ts`, implementada por `api-repository.ts` com fetch) e, se falhar, desfaz só aquela mudança e mostra um toast. Não há persistência local: a fonte de verdade é o servidor. Banco sem dados mostra "Carregar dados de demonstração"; banco não configurado (503) mostra "Banco de dados não configurado".

## Fora do escopo desta sprint

Login e perfis (Sprint 3), RLS por usuário e importação automática do Kalif. O dataset da planilha foi transcrito à mão para `src/lib/data/planilha-dataset.ts`; se a planilha for exportada em CSV, conferir o arquivo contra o CSV. `gabarito-fixture.ts` é só fixture de testes.
