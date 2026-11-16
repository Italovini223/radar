# Modelo de dados

Formato inspirado no Kalif: **cliente + frente + data** (+ status). Definições em `src/lib/domain/types.ts`. Tudo que é "oportunidade" é **derivado**, nunca guardado.

## Entidades

### Client

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string | slug estável (`flor-de-sal`) |
| `nome` | string | anonimizado/fictício |
| `segmento` | string | texto livre |
| `responsavel` | string | squad (não pessoa) |
| `ativo` | boolean | inativos saem da grade e do Radar |

### Frente

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string | `google-ads`, `meta-ads`, `crm`, `cro`, `layout`, `conteudo`, `materiais`, `redacao` |
| `nome` | string | |
| `setor` | `Setor` | Mídia paga, CRM & Automação, CRO & UX, Conteúdo, Materiais, Redação |
| `prazoDias` | number | máximo desejado entre ações concluídas (editável em Configurações) |

### Acao

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string | |
| `clientId`, `frenteId` | string | chaves |
| `titulo` | string | |
| `data` | `yyyy-MM-dd` | |
| `status` | `concluida` \| `em_andamento` \| `aguardando_aprovacao` | só `concluida` zera o contador |
| `aguardandoDesde?` | `yyyy-MM-dd` | usado pela regra de aprovação travada |
| `origem?` | `seed` \| `manual` \| `checkup` | |

### Checkup

`{ id, clientId, data, resultadoAds?: 'estavel' | 'caindo' | 'subindo' }`. O resultado de Ads é anotação manual e **não** entra nas regras.

### Atribuicao

`{ oportunidadeId, setor, data, texto }`: grava "Atribuir ao setor" do diálogo de proposta. Uma por oportunidade.

### Derivados (não persistidos)

- `StatusFrente` (`montarGrade` em `rules.ts`): por par cliente x frente, `estado`, `dias`, `nunca`, `travada`.
- `Opportunity` (`derivarOportunidades` em `opportunities.ts`): `id` determinístico (`parada:<cliente>:<frente>` ou `aprovacao:<cliente>:<frente>`), `severidade`, `motivo`, `diasParado`, `setorResponsavel`, `nova`.

## Regras (resumo)

Ver `docs/escopo-v1.md` e `src/lib/domain/rules.ts`. Limiares: 75% / 100% / 150% do prazo, aprovação travada > 7 dias, "nova" = venceu há até 14 dias. "Hoje" é sempre parâmetro (`now`).

## Persistência hoje

`src/lib/data/repository.ts` define a interface assíncrona:

```ts
interface RadarRepository {
  load(): Promise<RadarSnapshot | null>
  save(snapshot: RadarSnapshot): Promise<void>
  clear(): Promise<void>
}
```

Implementação atual: `localStorageRepository` (chave `weethub-radar:v1`). O zustand (`src/lib/store.ts`) usa o repositório como storage do `persist`, sem gravar antes da hidratação. O seed (`src/lib/data/seed.ts`) é gerado relativo à data de hoje.

## Plano de migração para o Supabase (Sprint 2)

1. **Tabelas** (esquema sugerido, uma por entidade): `clients(id text pk, nome, segmento, responsavel, ativo)`, `frentes(id text pk, nome, setor, prazo_dias int)`, `acoes(id uuid pk, client_id fk, frente_id fk, titulo, data date, status text check, aguardando_desde date null, origem text)`, `checkups(id uuid pk, client_id fk, data date, resultado_ads text null)`, `atribuicoes(oportunidade_id text pk, setor, data date, texto)`.
2. **Repositório**: criar `supabaseRepository` implementando `RadarRepository` (ou, melhor, trocar `load/save` por operações por entidade: `listAcoes`, `addAcao` etc., já que várias pessoas editarão ao mesmo tempo). As telas e o `rules.ts` não mudam, pois consomem só o store.
3. **Login e RLS**: autenticação Supabase e políticas por workspace; hoje não há login.
4. **Fonte Kalif**: um job de importação mapeia o Kalif para `acoes` (cliente + frente + data + status); o Check-up passa a ser exceção, não regra.
5. **Seed**: a tabela de gargalos plantados continua válida só para testes; em produção o seed é removido.
6. **Segredos**: chaves do Supabase só em variáveis de ambiente (`.env.local`, ignorado pelo git), nunca no código.
