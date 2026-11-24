# CI e proteção da `main`

## O que roda a cada PR

O workflow `.github/workflows/ci.yml` (job **`qualidade`**) roda em todo PR para a `main` e em todo push na `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test` (Vitest, sem rede e sem segredo)
5. `pnpm build`

O CI **não usa nenhum segredo**: os testes usam um banco falso em memória e o build não acessa o banco. O deploy (preview em cada PR e produção ao mesclar na `main`) é feito pela Vercel, não por este workflow.

Para rodar o mesmo localmente: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (Node 24, ver `.nvmrc`).

## Regras da `main` (Ruleset)

- Mudança só por **Pull Request** (sem push direto, sem force-push, sem apagar a branch).
- **1 aprovação** e todas as conversas resolvidas; aprovações antigas caem quando entra commit novo.
- O check **`qualidade`** precisa passar, e a branch precisa estar atualizada com a `main`.
- Só **squash merge** (histórico linear). As branches são apagadas depois do merge.
- O admin do repositório pode ignorar as regras **somente por PR** (válvula de emergência).

## Segurança

- Token do Actions somente leitura; `pull_request` (nunca `pull_request_target`).
- Ações de terceiros fixadas por SHA de commit; o Dependabot atualiza (npm e github-actions, semanal).
- Secret scanning e push protection ligados no repositório.
- Nunca commite chaves: `SUPABASE_SERVICE_ROLE_KEY` fica só em `.env.local` e nas variáveis da Vercel.
