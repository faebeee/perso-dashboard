# Productivity Dashboard

A personal, local-first dashboard that brings work from **GitHub**, **Jira Cloud**, **Gmail** and **Google Calendar** onto one customizable page, plus a unified **My Work** feed.

Built with TanStack Start (React, SSR + server functions), TanStack Query, Tailwind v4, shadcn/ui, Drizzle + SQLite.

## Quick start

```bash
npm install
cp .env.example .env
# set ENCRYPTION_KEY: openssl rand -base64 32
npm run dev            # http://127.0.0.1:3100 (bound to localhost only)
```

The SQLite DB (`data/dashboard.db`) is created and migrated automatically on first request. Then open **Integrations** and connect your accounts.

## Setting up the OAuth apps

All callback URLs follow `{APP_URL}/api/oauth/{id}/callback`.

| Integration | Where | Callback URL | Notes |
|---|---|---|---|
| GitHub | Settings → Developer settings → **OAuth Apps** | `http://127.0.0.1:3100/api/oauth/github/callback` | Scopes `repo read:user` are requested at login |
| Jira Cloud | [developer.atlassian.com](https://developer.atlassian.com/console/myapps/) → OAuth 2.0 (3LO) | `…/api/oauth/jira/callback` | Under *Permissions*, add **Jira API** with `read:jira-work`, `read:jira-user` |
| Gmail | Google Cloud Console → APIs & Services → enable **Gmail API** → Credentials → OAuth client (*Web application*) | `…/api/oauth/gmail/callback` | Consent screen in *Testing* mode, with yourself as a test user. Scope: `gmail.readonly` |
| Google Calendar | Same Google OAuth client as Gmail → also enable the **Google Calendar API** | `…/api/oauth/google-calendar/callback` (add it to the same client) | Scope: `calendar.readonly` |

Put each client id/secret pair in `.env` and restart. Integrations without credentials show as *Not configured*.

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server on 127.0.0.1:3100 |
| `npm test` | Vitest unit tests |
| `npm run check` | Biome lint/format check + `tsc --noEmit` |
| `npm run format` | Apply Biome fixes |
| `npm run db:generate` | Generate a migration after editing `src/server/db/schema.ts` |
| `npm run build` / `npm start` | Production build / run |

## Architecture

```
src/
  core/          Domain types and contracts. No I/O, no React runtime.
                 WorkItem, Result/IntegrationFailure, IntegrationServer,
                 IntegrationManifest, WidgetDefinition, OAuthProvider, layout schema
  server/        Server-only infrastructure: env, crypto, DB, repositories,
                 HTTP client, OAuth flow + token manager, composition root
  integrations/  One self-contained folder per provider + two registries
  components/    ui/ (shadcn), work-item/ (shared list), widget-kit/ (query states, widget factory)
  features/      dashboard/, feed/, connections/: UI + server fns per feature
  app/           Composition: query client, widget catalog, app shell
  routes/        Thin TanStack Router files that only compose features
```

**Dependency direction:** `routes → app → features → integrations → components/server → core`. Features don't import each other; `app/catalog.ts` wires them together (for example, the feed widget becomes part of the dashboard catalog there).

**Server/client boundary:** server-only modules start with `import "@tanstack/react-start/server-only"` or use the `*.server.ts` suffix. The build fails if client code imports them. The UI reaches providers only through `createServerFn` RPCs, which return a serializable `Result<T>`. On the client, `unwrap()` re-throws it as a typed `IntegrationFailure`, so widgets can show *Connect*, *Reconnect*, *Rate limited* or *Retry*.

**Data flow (one widget):**
`widget → useQuery(githubQueries.reviewRequests())` → server fn → `withIntegration()` (checks config, gets a valid token, refreshing it if needed) → `service` → `api/client` (zod-validated HTTP) → `mapper` → `WorkItem[]`

**Security:** OAuth tokens are AES-256-GCM encrypted at rest. The OAuth `state` and PKCE verifier live in a short-lived HttpOnly cookie. The dev server binds to 127.0.0.1 only.

### Anatomy of an integration

```
integrations/github/
  constants.ts            id, scopes, queries
  api/schemas.ts          zod schemas for the raw provider responses
  api/client.ts           typed HTTP wrapper (server-only, injectable fetch)
  mapper.ts               pure: provider payload → WorkItem
  service.ts              use-cases on top of the API
  oauth.ts                arctic → OAuthProvider adapter
  integration.server.ts   IntegrationServer implementation
  server-fns.ts           createServerFn RPCs for the UI
  queries.ts              TanStack Query options
  manifest.ts             client-safe: name, icon, widgets
  *.test.ts               mapper + service tests against fixtures
```

### Adding a new integration (e.g. Linear)

1. Copy `src/integrations/github/` to `src/integrations/linear/` and adapt the files above.
2. Add `linearManifest` to `integrations/registry.ts` and `linearServer` to `integrations/registry.server.ts`.
3. Add `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET` to `.env.example`.

Nothing else changes. Connection handling, OAuth routes, the feed and the dashboard pick it up through the registries.

### Swapping parts

| Replace | Touch only |
|---|---|
| OAuth library (arctic) | `server/oauth/arctic.ts`, each `integrations/*/oauth.ts` |
| Database (SQLite → Postgres) | `server/db/*`, `server/repositories/*`, `server/services.ts` |
| Grid engine (react-grid-layout) | `features/dashboard/components/dashboard-grid.tsx` |
| Token storage / encryption | `server/crypto.ts`, `server/services.ts` |
