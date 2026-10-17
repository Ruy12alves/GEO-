# Amazônico GEO

Scaffold inicial para uma aplicação de visibilidade em respostas de IA, feito para desenvolvimento local no VS Code.

## Requisitos

- Node.js 22 ou superior (`@supabase/server` requer Node 22; o ambiente atual tem Node 20.17)
- pnpm 10 ou npm compatível
- Docker Desktop para iniciar o Supabase local
- Supabase CLI

## Preparação

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Inicialize a configuração local do Supabase com `npx supabase init` (ou instale o CLI pelo método oficial para Windows).
4. Com Docker ativo, inicie o Supabase local com `npm run db:start`.
5. Gere a primeira migration a partir do schema de referência com `supabase db diff --local -f initial_core` e revise o SQL gerado.
6. Aplique/recrie o banco local com `npm run db:reset`; use a URL e a publishable key impressas pelo CLI em `.env.local`.
7. Execute `npm run dev` e abra http://localhost:3000.

## Estado do scaffold

- Interface inicial em pt-BR para o dashboard.
- Clientes Supabase SSR para browser e servidor.
- `@supabase/server` disponível para autenticação stateless em handlers de API; ele complementa `@supabase/ssr`, que mantém sessões por cookies no Next.js.
- Inngest está listado para a próxima etapa de workflows; ainda não há uma execução de monitoramento ativa.
- O Supabase CLI é necessário para usar os scripts `db:*`.
- O modelo inicial de banco e suas regras RLS estão em `supabase/schemas/core.sql`; o arquivo de migration deve ser gerado e revisado pelo CLI, que não pôde ser executado neste ambiente restrito.
- Nenhuma chamada de LLM está ativa ainda; chaves são somente variáveis de ambiente.

## Segredos

Nunca use service role no browser ou em variáveis `NEXT_PUBLIC_*`. `.env.local` não deve ser versionado. Use somente projeto Supabase de desenvolvimento durante a construção local.
