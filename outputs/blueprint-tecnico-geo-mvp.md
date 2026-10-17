# Blueprint técnico — Amazônico GEO / AI Visibility MVP

**Estado:** proposta para um projeto novo. A pasta examinada não contém código de aplicação, manifesto de dependências ou configuração Git; nenhum código do produto foi alterado.

## 1. Decisão de arquitetura

### Stack recomendada

| Camada | Escolha inicial | Papel |
|---|---|---|
| IDE e agente de desenvolvimento | VS Code + Codex | Construir em fatias pequenas; Codex trabalha sobre arquivos, migrations e comandos no repositório. |
| Aplicação web | Next.js App Router + TypeScript + React | Dashboard responsivo, páginas autenticadas e endpoints HTTP do produto. |
| UI | Tailwind CSS + shadcn/ui (ou componentes próprios acessíveis) | Interface de dashboard e formulários. |
| Autenticação e dados | Supabase Auth + PostgreSQL | Sessão, organizações, projetos, medições e políticas RLS. |
| Cliente Supabase web/SSR | `@supabase/ssr` e `@supabase/supabase-js` | Cookies seguros e cliente com sessão do usuário. |
| Trabalho assíncrono | Inngest (SDK TypeScript) | Execuções demoradas, etapas duráveis, repetição, limites de concorrência e agendamento. |
| IA | Adaptadores próprios para OpenAI Responses API; adicionar Gemini/Anthropic depois | Coleta de respostas e extração estruturada. |
| Validação | Zod | Validar entradas, saídas de LLM e payloads de API. |
| Testes | Vitest + Testing Library; Playwright para fluxos críticos; testes SQL/RLS | Regressão de domínio, UI e isolamento por tenant. |
| Desenvolvimento local | Node LTS, pnpm, Docker Desktop e Supabase CLI | Ambiente reproduzível com banco e Auth locais. |

**Por que esta combinação:** mantém frontend e backend de produto em TypeScript, substitui FlutterFlow/BuildShip por código versionado e deixa tarefas que podem demorar ou repetir fora da requisição web. Inngest oferece passos duráveis e reexecução a partir da etapa que falhou; isso ajuda em workflows que chamam serviços externos. Next Route Handlers servem como camada HTTP e Supabase mantém a fonte de verdade dos dados.

### Fluxo geral

```text
Navegador
  └─ Next.js (SSR, páginas e /api/v1)
       ├─ Supabase Auth + Postgres (RLS)
       └─ Inngest event → workflow de diagnóstico
                            ├─ rastrear site permitido
                            ├─ gerar perguntas
                            ├─ consultar provedores LLM
                            ├─ extrair menções, fontes e concorrentes
                            ├─ calcular métricas determinísticas
                            └─ persistir execução e resultados no Supabase
```

A aplicação nunca envia chaves de LLM ao navegador. Inngest coordena; a lógica do domínio permanece em módulos próprios, sem dependência de prompts escondidos na plataforma.

## 2. Escopo do primeiro protótipo

### Incluir

1. Cadastro/login e criação de organização.
2. Um projeto GEO por empresa, com nome, domínio, descrição, região e serviços.
3. Cadastro manual de até cinco concorrentes e até dez perguntas de monitoramento.
4. Uma execução sob demanda para um provedor LLM inicialmente.
5. Dashboard da execução: menção da empresa, presença/posição nas respostas, marcas concorrentes encontradas, fontes devolvidas pelo provedor e erros.
6. Histórico por projeto e comparação simples entre execuções.
7. Lista de oportunidades de conteúdo/ação gerada a partir das evidências, com revisão humana.

### Não incluir na primeira fatia

Billing, envio automático de conteúdo, raspagem indiscriminada da web, promessa de “ranking” universal, agentes que navegam e agem livremente, muitos provedores simultâneos, ou score mágico sem explicação. Resultado de LLM é amostra do modelo/provedor, prompt, região e horário, não garantia de recomendação real para todos os usuários.

## 3. Estrutura proposta do repositório

```text
amazonicogeo/
├─ .vscode/
│  ├─ extensions.json
│  └─ settings.json
├─ docs/
│  ├─ architecture.md
│  ├─ data-model.md
│  └─ prompt-evaluation.md
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (app)/dashboard/page.tsx
│  │  ├─ (app)/projects/[projectId]/page.tsx
│  │  ├─ (app)/projects/[projectId]/runs/[runId]/page.tsx
│  │  ├─ api/v1/projects/route.ts
│  │  ├─ api/v1/projects/[projectId]/runs/route.ts
│  │  ├─ api/v1/runs/[runId]/route.ts
│  │  ├─ api/v1/inngest/route.ts
│  │  └─ auth/callback/route.ts
│  ├─ components/
│  ├─ features/
│  │  ├─ projects/
│  │  ├─ monitoring/
│  │  └─ recommendations/
│  ├─ lib/
│  │  ├─ auth/
│  │  ├─ supabase/
│  │  ├─ env.ts
│  │  └─ http/
│  ├─ server/
│  │  ├─ repositories/
│  │  ├─ services/
│  │  ├─ providers/
│  │  │  ├─ llm-provider.ts
│  │  │  └─ openai-provider.ts
│  │  ├─ prompts/
│  │  └─ scoring/
│  └─ inngest/
│     ├─ client.ts
│     └─ functions/
│        └─ run-visibility.ts
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  └─ seed.sql
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ .env.example
├─ .gitignore
├─ package.json
├─ pnpm-lock.yaml
└─ README.md
```

## 4. Modelo de dados e migrações

Use UUIDs, timestamps em UTC (`timestamptz`), FKs com `on delete cascade` onde apropriado, índices nos FKs e estados como `text` com CHECK constraint ou enums pequenos. Adicione `organization_id` às tabelas do domínio para facilitar políticas e consultas multi-tenant.

### Migração 1 — extensões, organizações e membros

- `extensions`: habilitar apenas extensões necessárias. Não instalar pgvector até existir busca semântica concreta.
- `organizations(id, name, slug, created_at)`
- `organization_members(organization_id, user_id, role, created_at)`; PK composta, `user_id` referencia `auth.users`, role CHECK em `owner|admin|member`.
- Trigger opcional para perfil/organização inicial pode ser adicionado depois; prefira fluxo explícito de onboarding até conhecer o produto.

### Migração 2 — clientes e monitoramento

- `projects(id, organization_id, name, website_url, description, locale, region, created_by, created_at, updated_at)`
- `project_services(id, organization_id, project_id, name, description)`
- `competitors(id, organization_id, project_id, name, website_url, created_at)`
- `tracked_prompts(id, organization_id, project_id, prompt_text, intent, enabled, created_at)`; limite e frequência controlados pelo backend.
- Índices: `(organization_id, project_id)`; índice único opcional em domínio normalizado por organização.

### Migração 3 — execuções e evidências

- `monitoring_runs(id, organization_id, project_id, status, requested_by, provider_set, prompt_version, started_at, completed_at, error_code, created_at)`; status CHECK `queued|running|completed|partial|failed|cancelled`.
- `prompt_executions(id, organization_id, run_id, tracked_prompt_id, provider, model, status, latency_ms, token_input, token_output, cost_estimate, error_code, created_at)`
- `provider_responses(id, organization_id, prompt_execution_id, response_text, response_json, citations_json, created_at)`; controlar tamanho/retention das respostas brutas.
- `brand_mentions(id, organization_id, prompt_execution_id, brand_name, brand_type, mentioned, rank_position, sentiment, evidence, confidence)`; CHECK para brand_type `client|competitor|other`; rank/sentiment podem ser nulos.
- `recommendations(id, organization_id, run_id, title, rationale, evidence_json, effort, impact, status, created_at)`; status `proposed|accepted|dismissed|done`.

### Migração 4 — custos, integridade e auditoria mínima

- `usage_ledger(id, organization_id, run_id, provider, model, input_tokens, output_tokens, estimated_cost, created_at)`
- `audit_events(id, organization_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at)` para eventos de negócio úteis, sem guardar segredo ou texto sensível desnecessário.
- Índices para timeline: `monitoring_runs(project_id, created_at desc)`; resultados: `prompt_executions(run_id, status)`; menções por execução.
- Constraints de unicidade/idempotência, por exemplo `(run_id, tracked_prompt_id, provider)`, conforme possibilidade de rodar mais de uma amostra.

Manter o payload do provedor em JSONB só quando necessário para auditoria/reprocessamento. Dados normalizados em colunas tornam score e dashboards consultáveis. Definir retenção e limite de tamanho antes de guardar respostas indefinidamente.

## 5. RLS e autorização multi-tenant

1. Ativar RLS em toda tabela exposta em `public`; não confiar em UUIDs enviados pelo cliente como autorização.
2. Criar função SQL estável `is_org_member(org_id)` usando `auth.uid()` e `organization_members`; considerar `security definer` com `search_path` fixo e grants mínimos para evitar recursão de políticas. Alternativa mais simples: políticas com subconsulta direta, validada contra recursão/performance.
3. SELECT: usuário só lê linhas cuja `organization_id` tenha membership.
4. INSERT: `with check` exige membership e, para projetos/orgs, papel adequado; o backend valida vínculo pai/filho e deriva organização do recurso.
5. UPDATE/DELETE: membership + role apropriado; membros comuns não podem administrar membros ou remover organização.
6. `organization_members`: leitura limitada a colegas da mesma organização; owner/admin controla alterações de papel e convite.
7. Workers/Inngest: chamadas server-side usam segredo Supabase somente dentro do runtime confiável. Preferir cliente Supabase com JWT do usuário quando a operação é em nome dele e deve continuar sob RLS. Se usar `service_role`, nunca expor ao browser, limitar seu uso a operações internas e validar membership explicitamente antes de qualquer query.
8. Testes negativos obrigatórios: usuário da org A não lê nem atualiza registros da org B, incluindo IDs conhecidos; membro comum não se promove a owner. Views/functions devem preservar RLS e grants.
9. Toda rota verifica sessão, organização autorizada, schema de entrada e rate limit antes de enfileirar custo de IA.

## 6. Workflows/“agentes” de IA

Começar com workflow determinístico em etapas nomeadas, cada uma limitada e observável. “Agente” aqui é um componente com uma tarefa estreita e saída validada, não um agente com ferramentas ilimitadas.

### Workflow `visibility/run.requested`

1. **Validar e reservar** — carregar projeto, prompts ativos e organização; impor limite de execução; inserir run idempotente como `queued`.
2. **Preparar contexto** — resumir nome, domínio, região, serviços e lista explícita de concorrentes. Tratar conteúdo do site e respostas externas como dados não confiáveis.
3. **Descoberta do site (opcional na primeira versão)** — buscar poucas páginas públicas do domínio autorizado, impor timeout, limite de bytes, content type, redirect cap e proteção SSRF (bloquear localhost, IPs privados, metadata endpoints e revalidar DNS após redirects). Se isso atrasar o MVP, iniciar só com contexto preenchido pelo usuário.
4. **Gerar perguntas** — produzir variantes informacionais/comerciais para nicho, região e serviços. Saída JSON validada; limitar N por projeto e salvar snapshot da versão.
5. **Consultar provedor** — uma chamada por pergunta; concorrência e timeout definidos; armazenar versão de modelo, região quando conhecida, latência e uso/custo reportado. Não solicitar chain-of-thought.
6. **Extrair evidências** — segundo passo estruturado identifica empresa, concorrentes, posições/ordem, citações/fontes e evidência textual curta. Não aceitar alegações sem apontar trecho de resposta; considerar “posição” uma heurística da ordem de apresentação.
7. **Calcular métricas** — código determinístico: share of voice = respostas com menção à empresa / respostas válidas; taxa de citação, frequência e posição mediana. Sempre exibir denominador e respostas válidas.
8. **Recomendações** — gerar poucas ações com referência a evidências concretas, impacto/esforço qualitativos e confiança; status inicial `proposed`, revisão humana antes de qualquer publicação.
9. **Finalizar** — concluir como `completed`, `partial` ou `failed`; guardar erros por pergunta sem apagar resultados válidos.

### Contrato do extrator

Resposta de modelo validada por Zod, por exemplo:

```json
{
  "mentions": [
    {
      "brand": "string",
      "brand_type": "client|competitor|other",
      "mentioned": true,
      "rank_position": 1,
      "sentiment": "positive|neutral|negative|uncertain",
      "evidence": "trecho curto literal da resposta",
      "confidence": 0.0
    }
  ],
  "citations": [{"url": "https://...", "title": "string|null"}]
}
```

Regra de avaliação: primeiro comparar com fixtures rotuladas manualmente; chamar um segundo LLM como “judge” só em casos ambíguos e avaliar custo/ganho. Resposta estruturada reduz erro de parsing, mas não garante verdade. Persistir `prompt_version`, provedor/modelo e timestamps para explicar diferenças.

### Prompts versionados

- `question-generator.v1`: gerar até N perguntas realistas em pt-BR por serviço/região/intenção; não inventar fatos sobre a empresa; devolver apenas schema JSON.
- `visibility-extractor.v1`: extrair somente evidências presentes no texto; não inferir menção implícita; `rank_position` é ordem de apresentação; citações somente URLs explicitamente retornadas pelo provedor.
- `recommendation-writer.v1`: recomendar ações específicas apoiadas nas evidências fornecidas; distinguir fato de hipótese; sem prometer aumento de recomendação/ranking.
- Cada prompt usa campo versionado no código e testes fixture; registrar versão e modelo em cada run.

## 7. API do produto

Prefixo `/api/v1`. JSON, validação Zod, códigos de erro estáveis, paginação por cursor para histórico.

| Método e rota | Uso |
|---|---|
| `GET /api/v1/me` | Usuário e organizações acessíveis. |
| `POST /api/v1/organizations` | Criar organização e membro owner em transação/RPC. |
| `GET /api/v1/projects` | Listar projetos da organização selecionada/autorizada. |
| `POST /api/v1/projects` | Criar projeto e serviços. |
| `GET /api/v1/projects/:id` | Detalhe autorizado. |
| `PATCH /api/v1/projects/:id` | Atualizar metadados. |
| `POST /api/v1/projects/:id/competitors` | Adicionar concorrente. |
| `POST /api/v1/projects/:id/prompts` | Criar pergunta monitorada. |
| `GET /api/v1/projects/:id/runs` | Histórico paginado. |
| `POST /api/v1/projects/:id/runs` | Criar run e emitir evento; responder `202 {runId,status}`. |
| `GET /api/v1/runs/:id` | Status, métricas e sumário autorizado. |
| `GET /api/v1/runs/:id/results` | Resultados normalizados/evidências. |
| `PATCH /api/v1/recommendations/:id` | Aceitar, dispensar ou marcar ação como concluída. |
| `POST /api/v1/inngest` | Endpoint técnico do SDK Inngest, validado pelo SDK/assinatura. |

Operações demoradas retornam imediatamente; frontend consulta status por polling inicialmente. Supabase Realtime é opcional, depois de autenticação/RLS do canal definida.

## 8. Variáveis de ambiente e segredos

`.env.example` contém apenas nomes e valores locais fictícios; arquivo real fica ignorado pelo Git.

**Públicas (sem segredo):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou publishable key conforme formato atual do projeto)

**Somente servidor:**

- `SUPABASE_SERVICE_ROLE_KEY` — só se estritamente necessário; preferir contexto JWT/RLS em rotas de usuário.
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (quando habilitar Gemini)
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (valores de ambiente/conta; em modo local seguir configuração do Dev Server)
- `APP_BASE_URL`
- `CRON_SECRET` (somente se houver endpoint cron próprio)
- chaves de observabilidade/analytics, se adicionadas.

**Não comitar:** `.env.local`, credencial do banco, service role, chaves de LLM, tokens de CI. Validar env no startup com Zod e falhar com mensagem sem revelar conteúdo. Rotacionar segredo exposto; não passar segredo para prompts nem logs.

## 9. Testes e critérios de aceite

### Unitários

- Normalização de domínio, métricas e denominadores.
- Parser/validador de saída e prompts com fixtures gravadas (sem chamar API em todo teste).
- Política para menção, posição, citação e respostas parciais.

### Integração

- Rotas autenticadas com Supabase local.
- Migrations do zero e seed reproduzível.
- RLS multi-tenant: autorização positiva e cruzamento org A/org B negativo.
- Workflow: sucesso, falha de provedor, timeout, retry/idempotência; não duplicar execuções/resultados.
- Contratos dos adaptadores de provedor por mocks.

### E2E

- Cadastro/login → criar organização/projeto → configurar perguntas → executar monitoramento → ver status e resultados → revisar recomendação.
- Verificar estado vazio, parcial/erro e tela pequena.

### Aceite do primeiro protótipo

- Clone e instruções do README deixam qualquer colaborador executar localmente.
- `supabase db reset` recria schema e seed do zero.
- Nenhuma rota permite acesso cross-tenant nos testes.
- Run concluído, parcial ou falho tem evidências/erro rastreáveis.
- Indicadores expõem denominador e provedor/modelo/período; não apresentam “score” sem definição.
- API de LLM mockada em CI; chamadas reais ficam em smoke test manual e controlado.

## 10. Desenvolvimento local no VS Code

1. Instalar Node.js LTS, pnpm, Git, Docker Desktop e Supabase CLI; adicionar extensões de ESLint, Prettier, Tailwind e Supabase SQL.
2. Criar o projeto Next.js com TypeScript, App Router, ESLint e alias `@/*`; inicializar Git se ainda não houver repositório.
3. Instalar dependências de UI, Supabase SSR/client, Zod, Inngest e ferramentas de teste.
4. Executar `supabase init`; adicionar migrações pequenas e `seed.sql`; subir stack local com `supabase start`.
5. Copiar URLs/chaves locais exibidas pelo CLI para `.env.local`; nunca usar service key de produção no desenvolvimento.
6. Rodar `supabase db reset` para provar que todas as migrations/seed recriam o banco.
7. Subir Inngest Dev Server local e configurar o app Next para apontar para ele; expor e registrar `/api/v1/inngest`.
8. Rodar `pnpm dev`; abrir Supabase Studio local, dashboard e logs do workflow.
9. Rodar lint, typecheck, unitários, integração e E2E conforme cada fatia; manter chamadas LLM mockadas por padrão.
10. Depois que local estiver reproduzível, criar projeto Supabase remoto de desenvolvimento separado, configurar segredos fora do Git, revisar migrations e aplicar somente no alvo correto.

Os comandos exatos dependem das versões do CLI e do SDK fixadas no lockfile; documentar comandos confirmados no README quando o scaffold for realmente criado. `supabase db reset` local apaga o banco local e o recria; não usar variante remota sem confirmar que o alvo é descartável.

## 11. Fases de implementação

1. **Fundação:** repositório, Next.js, lint/typecheck, layout, configuração VS Code, Supabase CLI local e pipeline de migrations.
2. **Identidade e isolamento:** Auth, organizações/memberships, RLS, testes cross-tenant e onboarding.
3. **Cadastro GEO:** projetos, serviços, concorrentes, perguntas e telas CRUD.
4. **Execução assíncrona:** Inngest, tabela run/status, fluxo fake com resultados fixture e idempotência.
5. **Primeiro provedor LLM:** adaptador único, prompt versionado, custos/timeout, extração estruturada e persistência.
6. **Métricas e recomendações:** cálculo determinístico, evidências, revisão humana e histórico/comparação.
7. **Qualidade e piloto:** testes E2E, tratamento de custo/rate limits, observabilidade, revisão de retenção e deploy de staging.
8. **Expansão:** segundo provedor, descoberta do site com controles SSRF, agenda recorrente, exportação e billing após validar uso.

## 12. Trade-offs e alternativa

- **Next.js Route Handlers + Inngest (recomendação):** menor número de runtimes e TypeScript ponta a ponta; Inngest é serviço externo para workflows hospedados. Dev Server facilita desenvolvimento local; avaliar custo, observabilidade, região/dados e lock-in antes de produção.
- **Next.js + Supabase Edge Functions + pg_cron/queue:** mais integração Supabase e menos fornecedores; runtime Deno e limites/ergonomia diferentes do Node, além de orquestração com mais peças próprias. Adequado se operação inteiramente Supabase for prioridade.
- **Next.js + FastAPI + LangGraph:** melhor se workflows Python complexos, estado ramificado e checkpoints justificarem; adiciona segundo serviço, linguagem, deploy e manutenção. LangGraph oferece persistência/checkpoints, mas não é necessário para o primeiro fluxo linear.
- **Não usar LangChain/LangGraph no dia 1:** chamadas diretas via SDK oficial + adaptador interno e schema estruturado mantêm o controle de custo e a depuração simples. Adotar framework quando houver ferramentas, estado, branching ou múltiplos passos que justifiquem.
- **LLM como medidor:** resultados são probabilísticos e variam com modelo, região, prompt, temperatura, disponibilidade de busca e data. Medições comparáveis precisam registrar esses fatores; não vender causalidade ou garantia de ranking.

## Referências oficiais

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) e [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Supabase: fluxo local com CLI](https://supabase.com/docs/guides/local-development/cli-workflows), [migrations](https://supabase.com/docs/guides/local-development/database-migrations), [segurança de dados e RLS](https://supabase.com/docs/guides/database/secure-data), [SSR Auth](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Inngest: execução durável](https://www.inngest.com/docs/durable-execution), [retries](https://www.inngest.com/docs/durable-execution/guides-and-advanced/error-handling/retries), [boas práticas/idempotência](https://www.inngest.com/docs/durable-execution/best-practices)
- [OpenAI API docs](https://platform.openai.com/docs/overview) — selecionar endpoint/modelo suportado na implementação e fixar versão/configuração.

