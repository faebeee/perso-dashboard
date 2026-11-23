# Productivity Dashboard

A personal, local-first **desktop app** that brings work from **GitHub**, **Jira Cloud**, **Gmail**, **Google Calendar** and **Sentry** onto one customizable page, plus a unified **My Work** feed. Each source also has its own overview page in the sidebar, with headline numbers, breakdowns and full lists. The **Urgent** view (top of the sidebar, with a live count, also available as a widget) shows only what needs you soon:

| Source | Urgent when… |
|---|---|
| Google Calendar | a meeting is on now or starts within 2h (≤15 min counts as *right now*), or an invitation for the next 48h is unanswered |
| GitHub | your review is requested (escalated after 24h without activity); one of your ready PRs has changes requested or failing checks |
| Jira | an issue assigned to you is overdue, due today, or Highest/Blocker/Critical/High priority (overdue issues are found however long ago they were last touched), or a fix version is overdue |
| Gmail | unread inbox mail marked Important from the last 2 days |
| Sentry | an unresolved issue assigned to you or your teams is escalating, regressed or fatal; a new one assigned to you personally |

Thresholds live in `ATTENTION_RULES` (`src/core/attention.ts`); each integration's rules are in its `attention.ts`.

Built with Tauri 2 (Rust shell), React, TanStack Router + Query, Tailwind v4, shadcn/ui, Drizzle + SQLite.

## Quick start

Prerequisites: Node 22+, Rust (stable), and the [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run dev        # starts Vite on 127.0.0.1:3100 and opens the app window
```

Then open **Integrations**, enter the OAuth client for each provider, and click **Connect**. Login happens in your normal browser. There is no `.env` file.

`npm run build` produces installers under `src-tauri/target/release/bundle/`.

## Plan your day

- **Today** (top of the sidebar) shows:
  - A briefing with headline tiles: meetings, free time left, what's due or overdue, and what's waiting on you.
  - Your day as a timeline: meetings interleaved with free blocks within your workday.
  - **Your list:** pinned items and quick notes. Unfinished items carry over to the next day.
  - What needs you.
- **Pin anything:** the calendar icon on any row (widgets, My Work, Urgent, source pages) adds it to Today.
- **Quick capture:** ⌃⌥Space (Ctrl+Alt+Space) works from anywhere, even with the app in the background. In ⌘K, type and choose *Add “…” to Today*.
- **Done / Snooze** on urgent items: *Done* hides an item until it escalates. *Snooze* hides it for 1h, 3h, until tomorrow morning or next week. Cleared items leave the badge, the menu bar and notifications too; restore them under *Done & snoozed*.
- **Morning briefing notification:** once per day, at the start of your workday.
- Workday hours, the briefing and the shortcut are set in **Preferences**.

## Daily review

**Daily review** (sidebar, right after Today) prepares your standup:

- **What you did:** a timeline by day and time, since your last workday (Friday on Mondays) or for the last 24 hours. It covers merged, opened and reviewed PRs, resolved and worked-on issues, meetings, sent mail, and items you ticked off on Today.
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
| Gmail | conversations from the last 14 days where your message is still the last one after 2+ days |
| Jira | issues you reported that are still open and unassigned |
| Google Calendar | meetings you organize in the next 7 days with invitees who haven't replied |

**Meeting prep:** for your next meetings with other people (next 24h), it shows recent email conversations with the attendees. Integrations contribute through `getWaitingItems` and `getRelatedToPeople`; thresholds are in `WAITING_RULES` (`src/core/waiting.ts`).

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

By default only your **primary** Google calendar is read. To add others (team calendars, calendars shared with you, subscriptions), go to **Preferences → Google Calendar** or click **Choose calendars** on the Integrations page, then tick them. Selected calendars feed the agenda, Today, Urgent, Waiting, Insights and meeting prep. A meeting that appears on several calendars is shown once. Events on shared calendars that you aren't invited to never count as "yours" (e.g. for pending replies).

This uses a generic `choice-list` setting: an integration declares it in `settings` and serves the options through `loadSettingOptions`, and Preferences renders them as checkboxes.

## Dependabot alerts

The GitHub page (and the *Dependabot alerts* widget) lists open Dependabot alerts across the repositories you can write to: the 50 most recently pushed, non-archived ones, cached for 10 minutes. It shows counts per severity, then the alerts sorted most severe and longest-open first, with package, advisory, CVE/GHSA id and the fixed version. Repos where Dependabot is off, or whose alerts you can't see, are counted as skipped. GitHub has no single "all my alerts" endpoint for users, so each repo is checked separately.

Connections made before this feature lack the `security_events` permission. The app shows *Reconnect needed* until you reconnect GitHub once.

## Commits

Your pushed commits appear on the GitHub page ("Your commits", last 7 days, grouped by repo and branch), in Insights' Summary and in the Daily review. Standups condense them per branch: "5 commits to acme/web (feature/cart): Fix rounding".

They come from your GitHub activity events, which cover all repos and branches you pushed to, private ones included. Since October 2025 those events no longer list commits, so each push is expanded with the compare API: the 25 most recent pushes, cached for a day since commits never change. Commits of other people that arrive in your pushes (e.g. merging main) are left out. GitHub keeps events for 90 days (300 at most).

## Sync & rate limits

Every API call goes through one cache in the shared HTTP client (`src/platform/http-cache.ts`), so integrations get it for free:

- **Fresh data is reused.** Each API client declares how long its endpoints stay fresh (`src/platform/cache-ttl.ts`): searches and lists 1–2 min, releases and thread metadata 5–10 min, profiles and organizations a day. Widgets, the feed, Urgent, Waiting and the menu bar all share one fetch, so the UI can refresh every minute cheaply.
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

Themes are token overrides in `src/themes.css` (`:root[data-theme="…"]` plus `.dark`). Components only opt in through `font-display` (headings and big numbers) and `chart-bar` / `meter-fill`. Fonts are bundled (OFL) because the app works offline. The stored mode and theme are applied before first paint. To add a theme, add its id to `APPEARANCE_IDS`, its tokens to `themes.css` and its preview to `src/components/appearance/themes.ts`; a test checks the preview colours match the CSS.

## Desktop behaviour

- **Menu bar:** an icon with the urgent count. Its menu lists the urgent items (click to open), plus *Open Urgent*, *Open Dashboard* and *Quit*. The same count shows on the **Dock badge**.
- **Background:** closing the window keeps the app running, so the count and notifications stay live. Click the Dock or menu-bar icon to bring the window back; quit with ⌘Q or from the menu bar. Launching the app a second time focuses the running one.
- **Notifications** when something becomes urgent: once per item, and again if it escalates (e.g. a meeting moving to "starts in 10 min"). More than 3 at once arrive as one summary. Toggle them in **Preferences**.
- **Open at login**: toggle in **Preferences**.
- **⌘K / Ctrl+K** searches pages, urgent items, My Work and releases.
- The window remembers its size and position. On macOS, content runs under a transparent title bar.

Code: native parts are in `src-tauri/src/desktop.rs`, the `Host.desktop` port in `src/platform/host.ts`, and its Tauri adapter in `src/platform/tauri/desktop.ts`. `src/app/desktop/desktop-sync.tsx` mirrors the urgent items to the menu bar, badge and notifications, and the notify rule lives in `src/features/attention/alerts.ts`.

## Where data lives

| What | Where |
|---|---|
| SQLite DB (connections, OAuth clients, layout) | App config dir, e.g. `~/Library/Application Support/local.productivity-dashboard/dashboard.db` |
| Key that encrypts tokens + client secrets (AES-256-GCM) | OS credential store: macOS Keychain, Windows Credential Manager, Linux Secret Service |

Migrations in `drizzle/` are bundled into the app and applied on startup.

## Setting up the OAuth apps

**Easiest:** on the Integrations page, click **Guided setup** on a source. It walks you through creating the OAuth app step by step, with links, the exact values to paste (copy buttons included) and the redirect URI. Then you enter the credentials and connect. The table below has the same information.

The app uses the desktop OAuth flow from [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252). It opens your system browser, and the provider redirects to a short-lived listener on **`http://127.0.0.1:47390`**. PKCE is used where the provider supports it. Each integration card shows the exact redirect URI to register, with a copy button.

| Integration | Where | Redirect URI | Notes |
|---|---|---|---|
| GitHub | Settings → Developer settings → **OAuth Apps** | `http://127.0.0.1:47390/oauth/github/callback` | Scopes `repo read:user security_events` are requested at login (`security_events` is needed for Dependabot alerts). |
| Jira Cloud | [developer.atlassian.com](https://developer.atlassian.com/console/myapps/) → OAuth 2.0 (3LO) | `http://127.0.0.1:47390/oauth/jira/callback` | Must match exactly. Under *Permissions*, add **Jira API** with `read:jira-work` and `read:jira-user`. |
| Gmail + Google Calendar | Google Cloud Console → APIs & Services → enable **Gmail API** and **Google Calendar API** → Credentials → OAuth client of type **Desktop app** | Nothing to register: Desktop clients accept any loopback port | One client is shared by both integrations. Consent screen in *Testing* mode, with yourself as a test user. |
| Sentry (sentry.io, US or EU) | User Settings → API → **Applications** → *Create New Application* | `http://127.0.0.1:47390/oauth/sentry/callback` | Must match exactly. Scopes `org:read project:read event:read` are requested at login. All organizations you're a member of are included (EU orgs via their region host). |

Client secrets are stored encrypted on this device. Desktop apps are "public" OAuth clients, but these three providers still require the secret at the token endpoint.

> The port is fixed in `OAUTH_LOOPBACK_PORT` (`src/platform/services.ts`) because Atlassian matches redirect URIs exactly. If you change it, update the registered URIs.

## Scripts

| | |
|---|---|
| `npm run dev` | Desktop app with hot reload (`tauri dev`) |
| `npm run build` | Release build + installers (`tauri build`) |
| `npm run dev:ui` / `build:ui` | Vite only (used by Tauri; the UI needs the Tauri runtime to work) |
| `npm test` | Vitest unit tests (`cd src-tauri && cargo test` for the Rust side) |
| `npm run check` | Biome lint/format check + `tsc --noEmit` |
| `npm run format` | Apply Biome fixes |
| `npm run db:generate` | Generate a migration after editing `src/platform/db/schema.ts` |

## Architecture

```
src/
  core/          Domain types and contracts. No I/O, no React runtime.
                 WorkItem, Result/IntegrationFailure, IntegrationBackend,
                 IntegrationManifest, WidgetDefinition, OAuthProvider, layout schema
  platform/      Infrastructure behind the Host port: crypto, DB + migrations,
                 repositories, HTTP client, OAuth (client, flow, token manager),
                 composition root (services.ts)
    host.ts      The Host port: fetch, database, encryption key, browser OAuth, open links
    tauri/       The Tauri adapter for Host (the only code importing @tauri-apps/*)
  integrations/  One self-contained folder per provider + two registries
  components/    ui/ (shadcn), work-item/, release/, calendar/ (shared lists),
                 widget-kit/ (query states, widget factory, scope filter),
                 overview-kit/ (stat tiles, sections, breakdown bars)
  features/      dashboard/, feed/, releases/, attention/ (urgent view), connections/,
                 integration-overview/
  app/           Composition: query client, widget catalog, app shell, external links
  routes/        Thin TanStack Router files that only compose features
  main.tsx       Entry: picks the Host, mounts the router
src-tauri/       Rust shell: plugins (sql, http, opener), keychain key, OAuth loopback listener
```

**Dependency direction:** `routes → app → features → integrations → components/platform → core`. Features don't import each other; `app/catalog.ts` wires them together.

**Runtime model:** there's no server. Fetchers run in the webview and reach the OS only through `Host`:

- `plugin-http` gives provider APIs and token endpoints a fetch without CORS.
- `plugin-sql` provides SQLite.
- `src-tauri/src/secrets.rs` provides the encryption key from the OS keychain.
- `src-tauri/src/oauth_loopback.rs` handles the browser login.

The Rust side stays thin on purpose, so all product logic is TypeScript and unit-testable.

**Data flow (one widget):**
`widget → useQuery(githubQueries.reviewRequests())` → fetcher → `withIntegration()` (checks the OAuth client exists, gets a valid token, refreshing it if needed) → `service` → `api/client` (zod-validated HTTP via the host fetch) → `mapper` → `WorkItem[]`

**OAuth flow:** `features/connections` → `platform/oauth/oauth-flow.ts`:

1. Generate `state` and a PKCE verifier.
2. `Host.authorizeInBrowser`: Rust binds `127.0.0.1:47390`, opens the browser and returns the redirect URL.
3. Check `state`, exchange the code (`oauth2-client.ts`), then save the encrypted tokens.

**Security:** tokens and client secrets are AES-256-GCM encrypted at rest, with a key held in the OS keychain. The window has a strict CSP. HTTP access is limited to the provider hosts listed in `src-tauri/capabilities/default.json`. The loopback listener binds to 127.0.0.1 only, for one flow at a time, and closes when the flow ends. Links to other sites open in the system browser.

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

1. Copy `src/integrations/github/` to `src/integrations/linear/` and adapt the files above.
2. Add `linearManifest` to `integrations/registry.ts` and `linearBackend` to `integrations/runtime-registry.ts`.
3. Allow its API and token hosts under `http:default` in `src-tauri/capabilities/default.json`.

Connection handling, the OAuth flow, the credentials form, the feed, the dashboard and the sidebar pick it up through the registries. To give the source its own sidebar page, set `overview` in its manifest; it's served at `/apps/<id>`. To feed the Urgent view, implement `getAttentionItems` on its backend. To open its items in the detail modal instead of the browser, set `details` in its manifest and a `detailRef` on its items.

**Detail modal:** clicking a Jira issue or an email (in any list, the Urgent view or ⌘K) opens it in the app. ⌘/Ctrl/Shift/middle-click still opens the browser. Untrusted HTML (email bodies, Jira descriptions and comments) renders in a sandboxed iframe: no scripts, forms or navigation, plus a strict CSP. Remote images in email stay hidden until you click *Show images*, so senders can't track opens. See `src/components/item-detail/`.

### Swapping parts

| Replace | Touch only |
|---|---|
| Desktop shell (Tauri → something else) | a new `platform/<shell>/host.ts`, `main.tsx` |
| OAuth details of a provider | that integration's `oauth.ts` |
| Database (SQLite → other) | `platform/db/*`, `platform/repositories/*`, `platform/services.ts` |
| Grid engine (react-grid-layout) | `features/dashboard/components/dashboard-grid.tsx` |
| Token storage / encryption | `platform/crypto.ts`, `platform/services.ts`, `src-tauri/src/secrets.rs` |
