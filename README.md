# Productivity Dashboard

A personal, local-first **desktop app** that brings work from **GitHub**, **Jira Cloud**, **Gmail**, **Google Calendar**, **Outlook** (mail and calendar, Microsoft 365 or personal) and **Sentry** onto one customizable page, plus a unified **My Work** feed. Each source also has its own overview page in the sidebar, with headline numbers, breakdowns and full lists. The **Urgent** view (top of the sidebar, with a live count, also available as a widget) shows only what needs you soon:

| Source | Urgent when… |
|---|---|
| Google Calendar, Outlook Calendar | a meeting is on now or starts within 2h (≤15 min counts as *right now*), or an invitation for the next 48h is unanswered |
| GitHub | your review is requested (escalated after 24h without activity); one of your ready PRs has changes requested or failing checks; a repo you can write to has an open **critical** Dependabot alert |
| Jira | an issue assigned to you is overdue, due today, or Highest/Blocker/Critical/High priority (overdue issues are found however long ago they were last touched), or a fix version is overdue |
| Gmail | unread inbox mail marked Important from the last 2 days |
| Outlook | unread inbox mail marked high importance from the last 2 days |
| Sentry | an unresolved issue assigned to you or your teams is escalating, regressed or fatal; a new one assigned to you personally |

Thresholds live in `ATTENTION_RULES` (`packages/core/src/attention.ts`); each integration's rules are in its `attention.ts`.

Built with Tauri 2 (Rust shell), React, TanStack Router + Query, Tailwind v4, shadcn/ui, Drizzle + SQLite, in an npm workspaces + Turborepo monorepo.

## Quick start

Prerequisites: Node 22+, Rust (stable), and the [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run dev        # starts Vite on 127.0.0.1:3100 and opens the app window
```

Then open **Integrations**, enter the OAuth client for each provider, and click **Connect**. Login happens in your normal browser. There is no `.env` file.

`npm run build` builds everything; the installers land under `apps/desktop/src-tauri/target/release/bundle/`.

To install the desktop app on macOS, run `npm run install-app`. It copies the last build into `/Applications` (building first if there is none), and quits and replaces a running copy. Your data stays. Options: `--build` rebuilds first (only the `.app`, no DMG), `--user` installs into `~/Applications`, `--dir <path>` installs elsewhere, `--open` launches it afterwards. Pass them after `--`, e.g. `npm run install-app -- --build --open`.

## Plan your day

- **Today** (top of the sidebar) shows:
  - A briefing with headline tiles: meetings, free time left, what's due or overdue, and what's waiting on you.
  - Your day as a timeline: meetings interleaved with free blocks within your workday.
  - **Your list:** pinned items and quick notes. Unfinished items carry over to the next day.
  - What needs you.
- **Default dashboard:** new users start with a predefined layout (Urgent, reviews and calendar on top; your PRs, Jira issues and Sentry errors below; mail, My Work and Dependabot at the bottom). *Edit layout → Reset layout* brings it back. The preset lives in `packages/app/src/app/catalog.ts` (`defaultDashboard`).
- **Pin anything:** the calendar icon on any row (widgets, My Work, Urgent, source pages) adds it to Today.
- **Quick capture:** ⌃⌥Space (Ctrl+Alt+Space) works from anywhere, even with the app in the background. In ⌘K, type and choose *Add “…” to Today*.
- **Done / Snooze** on urgent items: *Done* hides an item until it escalates. *Snooze* hides it for 1h, 3h, until tomorrow morning or next week. Cleared items leave the badge, the menu bar and notifications too; restore them under *Done & snoozed*.
- **Morning briefing notification:** once per day, at the start of your workday.
- Workday hours, the briefing and the shortcut are set in **Preferences**.

## Daily review

**Daily review** (sidebar, right after Today) prepares your standup:

- **What you did:** a timeline by day and time, since your last workday (Friday on Mondays) or for the last 24 hours. It covers commits you pushed to any branch, merged, opened and reviewed PRs, resolved and worked-on issues, meetings, sent mail, and items you ticked off on Today.
- **Today:** your open Today items and today's meetings.
- **Blockers:** what you're waiting on others for (from Waiting).
- **Notes:** extra points, kept as a draft for the day.
- **Standup:** a live preview of the text, then **Copy** as Markdown, Slack or plain text.

Pinned items that also show up as activity (e.g. a pinned PR that got merged) are listed once.

**Project filter:** chips above the review list the repos and projects that appear in the period. Pick the ones you need and the timeline, Today, Blockers and the copied standup cover only those, with a `Projects: …` line on top. Meetings, mail and notes have no project; tick *Also show meetings, mail and notes* to keep them. The filter is remembered on this device. Pinned Today items remember their project.

## Waiting

**Waiting** (sidebar) lists what you're waiting on *others* for, oldest first:

| Source | Shows |
|---|---|
| GitHub | your ready PRs without any review yet |
| Gmail, Outlook | conversations from the last 14 days where your message is still the last one after 2+ days |
| Jira | issues you reported that are still open and unassigned |
| Google Calendar, Outlook Calendar | meetings you organize in the next 7 days with invitees who haven't replied |

**Meeting prep:** for your next meetings with other people (next 24h), it shows recent email conversations with the attendees. Integrations contribute through `getWaitingItems` and `getRelatedToPeople`; thresholds are in `WAITING_RULES` (`packages/core/src/waiting.ts`).

## Insights

**Insights** (sidebar) has two parts:

- **Summary:** what you did *since your last workday* (Friday on Mondays), *this week* or *last week*. It covers commits you pushed to any repo and branch, merged, opened and reviewed PRs, resolved and worked-on Jira issues, meetings and sent mail. **Copy as Markdown** gives a paste-ready standup or weekly update.
- **Trends:** six weeks of weekly charts:
  - time in meetings
  - PRs merged
  - PR cycle time (median, open → merge)
  - PRs reviewed
  - Jira issues resolved
  - emails received and sent

  Each chart compares last week with the average of the weeks before. The current week is hatched ("so far"). A **Table** view shows every value. Values marked ≈ are estimates (Gmail's counts; reviews counted by the PR's last activity).

Integrations contribute through `getActivity` and `getMetrics`.

## Calendars

By default only your **primary** Google calendar (or your default Outlook calendar) is read. To add others (team calendars, calendars shared with you, subscriptions), go to **Preferences → Google Calendar** / **Outlook Calendar** or click **Choose calendars** on the Integrations page, then tick them. Selected calendars feed the agenda, Today, Urgent, Waiting, Insights and meeting prep. A meeting that appears on several calendars is shown once. Events on shared calendars that you aren't invited to never count as "yours" (e.g. for pending replies).

This uses a generic `choice-list` setting: an integration declares it in `settings` and serves the options through `loadSettingOptions`, and Preferences renders them as checkboxes.

## Dependabot alerts

The GitHub page (and the *Dependabot alerts* widget) lists open Dependabot alerts across the repositories you can write to: the 50 most recently pushed, non-archived ones, cached for 10 minutes. It shows counts per severity, then the alerts sorted most severe and longest-open first, with package, advisory, CVE/GHSA id and the fixed version. Repos where Dependabot is off, or whose alerts you can't see, are counted as skipped. GitHub has no single "all my alerts" endpoint for users, so each repo is checked separately. Critical alerts also show up in **Urgent** (*today*); without repository access they are simply left out there.

GitHub scopes are hierarchical: the `repo` scope you already granted includes `security_events`, so no reconnect is needed (see `packages/app/src/integrations/github/scopes.ts`).

## Commits

Your pushed commits appear on the GitHub page ("Your commits", last 7 days, grouped by repo and branch), in Insights' Summary and in the Daily review. Standups condense them per branch: "5 commits to acme/web (feature/cart): Fix rounding".

They come from your GitHub activity events, which cover **every branch** of all repos you pushed to (feature branches, `test`, `main`…), private ones included. Since October 2025 those events no longer list commits, so each push is expanded with the compare API: up to the 100 most recent pushes, six requests at a time, cached for a day since commits never change. A new branch contributes all its commits that aren't on the default branch. Work that reached several branches (a feature branch merged into `test`, then `main`) is listed once, on the branch you pushed it to first. Commits of other people that arrive in your pushes (e.g. merging main) are left out. GitHub keeps events for 90 days (300 at most) and may list them up to a few hours late.

## Sync & rate limits

Every API call goes through one cache in the shared HTTP client (`packages/platform/src/http-cache.ts`), so integrations get it for free:

- **Fresh data is reused.** Each API client declares how long its endpoints stay fresh (`packages/platform/src/cache-ttl.ts`): searches and lists 1–2 min, releases and thread metadata 5–10 min, profiles and organizations a day. Widgets, the feed, Urgent, Waiting and the menu bar all share one fetch, so the UI can refresh every minute cheaply.
- **Concurrent identical requests** share one network call.
- **Revalidation** uses ETag / Last-Modified. A 304 doesn't count against GitHub's rate limit.
- **Rate-limit guard:** remaining/reset headers (GitHub, Sentry), `Retry-After`, and Google's 403 quota errors pause that API until it resets. GitHub's search and core pools are tracked separately. While paused, and when offline, the last cached data is shown instead of an error. The Integrations page and the sidebar show the state ("Synced 2 min ago", "Paused by rate limit until 14:05").
- **Persisted and encrypted** in SQLite, so restarts start warm. Entries older than 7 days are pruned, and an integration's entries are cleared when you connect or disconnect it.
- **Refresh** buttons (dashboard, source pages, ⌘K) mark data stale so they really refetch, still within the rate-limit guard.

## Themes

**Preferences → Appearance** (or ⌘K → "Theme: …") offers four themes, each with a light and a dark variant:

| Theme | Look |
|---|---|
| Default | neutral and quiet, the original look |
| Technical | monospace (JetBrains Mono), tight corners, faint blueprint grid, terminal green |
| Business | Inter, generous rounding, soft layered surfaces, a calm corporate blue |
| Dot | monochrome with one red signal colour, dot-matrix display type (Doto) for headings and numbers, dotted canvas, chart bars drawn as dots |

Themes are token overrides in `packages/ui/src/themes.css` (`:root[data-theme="…"]` plus `.dark`). Components only opt in through `font-display` (headings and big numbers) and `chart-bar` / `meter-fill`. Fonts are bundled (OFL) because the app works offline. The stored mode and theme are applied before first paint. To add a theme, add its id to `APPEARANCE_IDS`, its tokens to `themes.css` and its preview to `packages/ui/src/appearance/themes.ts`; a test checks the preview colours match the CSS.

## Desktop behaviour

- **Menu bar:** an icon with the urgent count. Its menu lists the urgent items (click to open), plus *Open Urgent*, *Open Dashboard* and *Quit*. The same count shows on the **Dock badge**.
- **Background:** closing the window keeps the app running, so the count and notifications stay live. Click the Dock or menu-bar icon to bring the window back; quit with ⌘Q or from the menu bar. Launching the app a second time focuses the running one.
- **Notifications** when something becomes urgent: once per item, and again if it escalates (e.g. a meeting moving to "starts in 10 min"). More than 3 at once arrive as one summary. Toggle them in **Preferences**.
- **Open at login**: toggle in **Preferences**.
- **⌘K / Ctrl+K** searches pages, urgent items, My Work and releases.
- The window remembers its size and position. On macOS, content runs under a transparent title bar.

Code: native parts are in `apps/desktop/src-tauri/src/desktop.rs`, the `Host.desktop` port in `packages/platform/src/host.ts`, and its Tauri adapter in `apps/desktop/src/host/desktop.ts`. `packages/app/src/app/desktop/desktop-sync.tsx` mirrors the urgent items to the menu bar, badge and notifications, and the notify rule lives in `packages/app/src/features/attention/alerts.ts`.

## Where data lives

| What | Where |
|---|---|
| SQLite DB (connections, OAuth clients, layout) | App config dir, e.g. `~/Library/Application Support/local.productivity-dashboard/dashboard.db` |
| Key that encrypts tokens + client secrets (AES-256-GCM) | OS credential store (macOS Keychain, Windows Credential Manager, Linux Secret Service) |

Migrations in `packages/platform/drizzle/` are bundled into the app and applied on startup.

## Setting up the OAuth apps

**Easiest:** on the Integrations page, click **Guided setup** on a source. It walks you through creating the OAuth app step by step, with links, the exact values to paste (copy buttons included) and the redirect URI. Then you enter the credentials and connect. The table below has the same information.

The app uses the desktop OAuth flow from [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252). It opens your system browser, and the provider redirects to a short-lived listener on **`http://127.0.0.1:47390`**. PKCE is used where the provider supports it. Each integration card shows the exact redirect URI to register, with a copy button.

| Integration | Where | Redirect URI | Notes |
|---|---|---|---|
| GitHub | Settings → Developer settings → **OAuth Apps** | `http://127.0.0.1:47390/oauth/github/callback` | Scopes `repo read:user` are requested at login (`repo` includes `security_events`, which Dependabot alerts need). |
| Jira Cloud | [developer.atlassian.com](https://developer.atlassian.com/console/myapps/) → OAuth 2.0 (3LO) | `http://127.0.0.1:47390/oauth/jira/callback` | Must match exactly. Under *Permissions*, add **Jira API** with `read:jira-work` and `read:jira-user`. |
| Gmail + Google Calendar | Google Cloud Console → APIs & Services → enable **Gmail API** and **Google Calendar API** → Credentials → OAuth client of type **Desktop app** | Nothing to register: Desktop clients accept any loopback port | One client is shared by both integrations. Consent screen in *Testing* mode, with yourself as a test user. |
| Outlook + Outlook Calendar | [Microsoft Entra](https://entra.microsoft.com/) → App registrations → *New registration*, account type **any organizational directory and personal Microsoft accounts** → platform **Public client/native (mobile & desktop)** | `http://localhost:47390/oauth/microsoft/callback` | One registration is shared by both integrations, with one redirect URI. Microsoft only accepts `http://localhost` in its portal (the listener still binds 127.0.0.1). No client secret: Microsoft refuses one from desktop apps, so only the client ID is asked for. Read-only Graph scopes `Mail.Read`, `Calendars.Read`, `Calendars.Read.Shared` (+ `User.Read`, `offline_access`). Work accounts may need an admin to grant consent. |
| Sentry (sentry.io, US or EU) | User Settings → API → **Applications** → *Create New Application* | `http://127.0.0.1:47390/oauth/sentry/callback` | Must match exactly. Scopes `org:read project:read event:read` are requested at login. All organizations you're a member of are included (EU orgs via their region host). |

Client secrets are stored encrypted on this device. Desktop apps are "public" OAuth clients, but GitHub, Atlassian, Google and Sentry still require the secret at the token endpoint (Microsoft is the exception: see above).

> The port is fixed in `OAUTH_LOOPBACK_PORT` (`packages/platform/src/services.ts`) because Atlassian matches redirect URIs exactly. If you change it, update the registered URIs.

## Scripts

Run from the repo root; Turborepo runs each task in every workspace that has it, in dependency order, and caches the results.

| | |
|---|---|
| `npm run dev` | Desktop app with hot reload (`tauri dev`) |
| `npm run build` | Desktop release build + installers (`tauri build`) |
| `npm run dev:ui -w @dashboard/desktop` / `build:ui` | The desktop's Vite only (used by Tauri; it needs the Tauri runtime to work) |
| `npm run install-app` | Install the desktop app into `/Applications` (macOS; see Quick start) |
| `npm test` | Vitest unit tests in every workspace (`cd apps/desktop/src-tauri && cargo test` for the Rust side) |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run check` | Biome lint/format check + typecheck |
| `npm run format` | Apply Biome fixes |
| `npm run db:generate` | Generate a migration after editing `packages/platform/src/db/schema.ts` |

Add a dependency to the workspace that uses it, e.g. `npm install date-fns -w @dashboard/app`.

## Architecture

```
packages/                 Shared code, consumed as TypeScript source (no build step)
  core/        @dashboard/core      Domain types and contracts. No I/O, no React runtime.
                                    WorkItem, Result/IntegrationFailure, IntegrationBackend,
                                    IntegrationManifest, WidgetDefinition, OAuthProvider, layout schema
  ui/          @dashboard/ui        Design system: shadcn/ui primitives (components/),
                                    cn() (lib/utils), tokens + themes (styles.css, themes.css),
                                    fonts, appearance (theme store, picker, pre-paint script)
  platform/    @dashboard/platform  Infrastructure behind the Host port: crypto, DB + migrations
                                    (drizzle/), repositories, HTTP client + cache, OAuth (client,
                                    flow, token manager), provider allowlist, composition root
                                    (services.ts), test doubles (testing/)
    src/host.ts                     The Host port: fetch, database, encryption key, browser OAuth,
                                    open links, desktop shell + its capabilities
  app/         @dashboard/app       The whole product UI, independent of the shell:
    src/integrations/               One self-contained folder per provider + two registries;
                                    shared/ holds pure rules any calendar or mail provider reuses
    src/components/                 work-item/, release/, calendar/, mail/, item-detail/,
                                    widget-kit/, overview-kit/, source-kit/
    src/features/                   dashboard/, feed/, today/, waiting/, insights/, attention/,
                                    connections/, preferences/, integration-overview/
    src/app/                        Composition: query client, widget catalog, app shell,
                                    command palette, external links
    src/routes/                     Code-based TanStack Router routes + route-tree.ts
    src/router.tsx                  createAppRouter(): the router the shell mounts
apps/
  desktop/     @dashboard/desktop   Tauri shell
    src/main.tsx                    Entry: Tauri host, router, external links
    src/host/                       The Tauri adapter for Host (the only code importing @tauri-apps/*)
    src-tauri/                      Rust: plugins (sql, http, opener), keychain key, OAuth loopback
```

**Dependency direction:** `apps → app → (ui, platform) → core`, and inside `@dashboard/app`: `routes → app → features → integrations → components`. Features don't import each other; `app/catalog.ts` wires them together. Inside `@dashboard/app`, `#/…` imports point at its own `src/`; other packages are imported by name (`@dashboard/ui/components/button`).

**Shell vs. shared UI:** the desktop app calls `createAppRouter()` from `@dashboard/app/router` and renders the code-based route tree into `index.html`. Its own code is only its `Host` adapter and entry point, so another shell would only need those two. Where a shell can't do something (e.g. no login item), the shared UI reads `Host.desktop.capabilities` instead of forking. Tailwind scans the shared packages through `@source` in their `styles.css`, so apps just import `@dashboard/app/styles.css`.

**Runtime model:** there's no server. Fetchers run in the webview and reach the OS only through `Host`:

- `plugin-http` gives provider APIs and token endpoints a fetch without CORS.
- `plugin-sql` provides SQLite.
- `apps/desktop/src-tauri/src/secrets.rs` provides the encryption key from the OS keychain.
- `apps/desktop/src-tauri/src/oauth_loopback.rs` handles the browser login.

The Rust side stays thin on purpose, so all product logic is TypeScript and unit-testable.

**Data flow (one widget):**
`widget → useQuery(githubQueries.reviewRequests())` → fetcher → `withIntegration()` (checks the OAuth client exists, gets a valid token, refreshing it if needed) → `service` → `api/client` (zod-validated HTTP via the host fetch) → `mapper` → `WorkItem[]`

**OAuth flow:** `features/connections` → `platform/oauth/oauth-flow.ts`:

1. Generate `state` and a PKCE verifier.
2. `Host.authorizeInBrowser`: Rust binds `127.0.0.1:47390`, opens the browser and returns the redirect URL.
3. Check `state`, exchange the code (`oauth2-client.ts`), then save the encrypted tokens.

**Security:** tokens and client secrets are AES-256-GCM encrypted at rest, with a key held in the OS keychain. The window has a strict CSP. HTTP access is limited to the provider URLs in `packages/platform/src/http-allowlist.ts`, enforced by `apps/desktop/src-tauri/capabilities/default.json` (a test keeps the two in sync). The loopback listener binds to 127.0.0.1 only, for one flow at a time, and closes when the flow ends. Links to other sites open in the system browser.

### Anatomy of an integration

```
integrations/github/
  constants.ts            id, scopes, queries
  api/schemas.ts          zod schemas for the raw provider responses
  api/client.ts           typed HTTP wrapper (injectable fetch)
  mapper.ts               pure: provider payload → WorkItem
  service.ts              use-cases on top of the API
  oauth.ts                OAuth client ref + endpoints (createOAuth2Provider)
  integration.ts          IntegrationBackend implementation
  fetchers.ts             entry points for the UI, return Result<T>
  queries.ts              TanStack Query options
  overview.tsx            the source's sidebar page (built from overview-kit)
  attention.ts            pure rules: what from this source is urgent
  *-detail-view.tsx       optional in-app detail modal (Jira issues, Gmail messages)
  manifest.ts             name, icon, widgets, overview
  *.test.ts               mapper + service tests against fixtures
```

### Adding a new integration (e.g. Linear)

1. Copy `packages/app/src/integrations/github/` to `packages/app/src/integrations/linear/` and adapt the files above.
2. Add `linearManifest` to `integrations/registry.ts` and `linearBackend` to `integrations/runtime-registry.ts`.
3. Allow its API and token URLs in `packages/platform/src/http-allowlist.ts` and under `http:default` in `apps/desktop/src-tauri/capabilities/default.json`.

Both apps pick it up; nothing in `apps/` changes.

A calendar or mail provider maps into `CalendarEvent` / `EmailDetail` (`packages/core/src/`) and reuses `integrations/shared/` plus `components/calendar` and `components/mail`, as Google and Outlook do. Providers whose integrations share one OAuth app put its config in `packages/platform/src/oauth/` (see `google.ts`, `microsoft.ts`).

Connection handling, the OAuth flow, the credentials form, the feed, the dashboard and the sidebar pick it up through the registries. To give the source its own sidebar page, set `overview` in its manifest; it's served at `/apps/<id>`. To feed the Urgent view, implement `getAttentionItems` on its backend. To open its items in the detail modal instead of the browser, set `details` in its manifest and a `detailRef` on its items.

**Detail modal:** clicking a Jira issue or an email (in any list, the Urgent view or ⌘K) opens it in the app. ⌘/Ctrl/Shift/middle-click still opens the browser. Untrusted HTML (email bodies, Jira descriptions and comments) renders in a sandboxed iframe: no scripts, forms or navigation, plus a strict CSP. Remote images in email stay hidden until you click *Show images*, so senders can't track opens. See `packages/app/src/components/item-detail/`.

### Swapping parts

| Replace | Touch only |
|---|---|
| Shell (Tauri → something else) | a new `apps/<shell>/` with a `Host` adapter and an entry that calls `createAppRouter()` |
| OAuth details of a provider | that integration's `oauth.ts` |
| Database (SQLite → other) | `packages/platform/src/db/*`, `repositories/*`, `services.ts` |
| Grid engine (react-grid-layout) | `packages/app/src/features/dashboard/components/dashboard-grid.tsx` |
| Token storage / encryption | `packages/platform/src/crypto.ts`, `services.ts`, `apps/desktop/src-tauri/src/secrets.rs` |
| A shadcn component | `packages/ui/` (run the shadcn CLI there; `components.json` is set up) |
