import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { rejectForeignRequest } from "./guard";
import { loadOrCreateKey } from "./key";
import { createOAuthRelay, OAuthRelayError } from "./oauth-relay";
import { proxyProviderRequest } from "./proxy";
import { openSqlDatabase, runSql, sqlRequestSchema } from "./sql";

/** Where the browser host reaches the server (see `src/host/`). */
export const HOST_API_PREFIX = "/api/host/";
const OAUTH_CALLBACK = /^\/oauth\/[^/]+\/callback$/;

/** One long-poll lasts at most this long; the browser simply asks again. */
const OAUTH_POLL_MS = 25_000;

const stateSchema = z.object({ state: z.string().min(16).max(512) });
const expectSchema = stateSchema.extend({
	timeoutSeconds: z
		.number()
		.int()
		.positive()
		.max(30 * 60),
});

export interface HostApiOptions {
	dataDir: string;
	fetchFn?: typeof fetch;
}

/**
 * The server half of the web app's `Host`: everything the desktop app gets
 * from Rust (CORS-free fetch, SQLite, the encryption key, the OAuth
 * loopback), as plain HTTP endpoints. Returns null for requests that aren't
 * its own, so the caller can hand them to TanStack Start.
 */
export function createHostApi({ dataDir, fetchFn = fetch }: HostApiOptions) {
	let db: DatabaseSync | undefined;
	const database = () => {
		db ??= openSqlDatabase(dataDir);
		return db;
	};
	const relay = createOAuthRelay();

	const routes: Record<string, (request: Request) => Promise<Response>> = {
		fetch: (request) => proxyProviderRequest(request, fetchFn),

		sql: async (request) => {
			const body = sqlRequestSchema.parse(await request.json());
			return Response.json({ rows: runSql(database(), body) });
		},

		key: async () => {
			const key = await loadOrCreateKey(dataDir);
			return Response.json({ key: Buffer.from(key).toString("base64url") });
		},

		"oauth/expect": async (request) => {
			const { state, timeoutSeconds } = expectSchema.parse(
				await request.json(),
			);
			relay.expect(state, timeoutSeconds * 1000);
			return new Response(null, { status: 204 });
		},

		"oauth/wait": async (request) => {
			const { state } = stateSchema.parse(await request.json());
			try {
				const url = await relay.wait(state, OAUTH_POLL_MS);
				return url
					? Response.json({ url: url.toString() })
					: new Response(null, { status: 204 });
			} catch (cause) {
				const kind = cause instanceof OAuthRelayError ? cause.kind : "io";
				return Response.json({ kind }, { status: 410 });
			}
		},

		"oauth/cancel": async (request) => {
			relay.cancel(stateSchema.parse(await request.json()).state);
			return new Response(null, { status: 204 });
		},
	};

	return async function handle(request: Request): Promise<Response | null> {
		const url = new URL(request.url);

		if (request.method === "GET" && OAUTH_CALLBACK.test(url.pathname)) {
			const delivered = relay.deliver(url);
			return callbackPage(delivered);
		}

		if (!url.pathname.startsWith(HOST_API_PREFIX)) return null;
		const rejected = rejectForeignRequest(request);
		if (rejected) return rejected;

		const route = routes[url.pathname.slice(HOST_API_PREFIX.length)];
		if (!route || request.method !== "POST") {
			return new Response("Not found", { status: 404 });
		}
		try {
			return await route(request);
		} catch (cause) {
			if (cause instanceof z.ZodError) {
				return Response.json({ error: "Invalid request" }, { status: 400 });
			}
			console.error("[host-api]", url.pathname, cause);
			const message = cause instanceof Error ? cause.message : String(cause);
			return Response.json({ error: message }, { status: 500 });
		}
	};
}

/** What the login tab shows after the provider sent it back. */
function callbackPage(delivered: boolean): Response {
	const [title, text] = delivered
		? [
				"You're signed in",
				"You can close this tab and return to the dashboard.",
			]
		: [
				"This sign-in has expired",
				"Go back to the dashboard and click Connect again.",
			];
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#18181b;background:#fafafa}@media(prefers-color-scheme:dark){body{color:#fafafa;background:#18181b}}main{text-align:center;padding:16px}</style></head><body><main><h1>${title}</h1><p>${text}</p></main>${delivered ? "<script>setTimeout(()=>window.close(),800)</script>" : ""}</body></html>`;
	return new Response(html, {
		status: delivered ? 200 : 410,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-store",
			"content-security-policy":
				"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
			"referrer-policy": "no-referrer",
		},
	});
}
