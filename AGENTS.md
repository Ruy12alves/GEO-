# Orientações para Codex

- Leia `README.md` e `outputs/blueprint-tecnico-geo-mvp.md` antes de alterar arquitetura.
- Mantenha o código do produto em TypeScript e as telas em pt-BR.
- Nunca exponha segredos em código cliente, variáveis `NEXT_PUBLIC_*` ou prompts. Não use service role em rotas autenticadas por usuário.
- Preserve RLS em todas as tabelas expostas. Mudanças SQL devem vir de `supabase/schemas/` e ser materializadas/revisadas em migration com o Supabase CLI.
- Em rotas, derive a identidade de `supabase.auth.getUser()` no servidor; não autorize com IDs enviados no body ou com `user_metadata`.
- Não alegue que uma resposta de LLM é verdade nem que o monitoramento garante ranking. Guarde modelo, versão de prompt, horário e evidências.
- Faça workflows duráveis e idempotentes; mantenha a extração de evidências e o cálculo das métricas em módulos separados.
- Antes de implementar chamadas reais a provedores, defina limites de custo, timeout, repetição e armazenamento de respostas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
