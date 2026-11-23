import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProxyFetch } from "../host/fetch";
import { createHostApi } from "./host-api";

const BASE = "http://127.0.0.1:47390";
const api = (path: string, body: unknown) =>
	new Request(`${BASE}/api/host/${path}`, {
		method: "POST",
		headers: {
			host: "127.0.0.1:47390",
			"x-dashboard-host": "1",
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

describe("host API", () => {
	let dataDir: string;
	beforeEach(() => {
		dataDir = mkdtempSync(join(tmpdir(), "dashboard-web-"));
	});
	afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

	it("leaves other requests to TanStack Start", async () => {
		const handle = createHostApi({ dataDir });
		expect(await handle(new Request(`${BASE}/today`))).toBeNull();
	});

	it("runs SQL against a database in the data directory", async () => {
		const handle = createHostApi({ dataDir });
		const sql = (method: string, statement: string, params: unknown[] = []) =>
			handle(api("sql", { method, sql: statement, params }));

		await sql("execute", "create table t (id integer, name text)");
		await sql("execute", "insert into t values (?, ?)", [1, "a"]);
		const response = await sql("select", "select id, name from t");
		await expect(response?.json()).resolves.toEqual({ rows: [[1, "a"]] });
		expect(statSync(join(dataDir, "dashboard.db")).isFile()).toBe(true);
	});

	it("creates the encryption key once, readable only by the user", async () => {
		const handle = createHostApi({ dataDir });
		const first = (await (await handle(api("key", {})))?.json()) as {
			key: string;
		};
		const second = (await (await handle(api("key", {})))?.json()) as {
			key: string;
		};
		expect(Buffer.from(first.key, "base64url")).toHaveLength(32);
		expect(second.key).toBe(first.key);
		expect(statSync(join(dataDir, "encryption.key")).mode & 0o077).toBe(0);
	});

	it("rejects invalid bodies and foreign callers", async () => {
		const handle = createHostApi({ dataDir });
		expect((await handle(api("sql", { sql: 1 })))?.status).toBe(400);
		const foreign = new Request(`${BASE}/api/host/key`, { method: "POST" });
		expect((await handle(foreign))?.status).toBe(403);
	});

	it("serves provider GETs and POSTs sent by the browser host", async () => {
		const provider = vi.fn<typeof fetch>(async (_, init) =>
			Response.json({ method: init?.method }),
		);
		const handle = createHostApi({ dataDir, fetchFn: provider });
		// The browser host's fetch, pointed at the handler instead of a network.
		const browserFetch = createProxyFetch(async (input, init) => {
			const request = new Request(new URL(String(input), BASE), init);
			request.headers.set("host", "127.0.0.1:47390");
			return (await handle(request)) ?? new Response(null, { status: 599 });
		});

		const get = await browserFetch("https://api.github.com/user");
		await expect(get.json()).resolves.toEqual({ method: "GET" });
		const post = await browserFetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				body: "code=1",
			},
		);
		await expect(post.json()).resolves.toEqual({ method: "POST" });
	});

	it("relays an OAuth redirect from the callback route to the app", async () => {
		const handle = createHostApi({ dataDir });
		const state = "s".repeat(32);
		await handle(api("oauth/expect", { state, timeoutSeconds: 60 }));
		const waiting = handle(api("oauth/wait", { state }));
		const page = await handle(
			new Request(
				`http://localhost:47390/oauth/microsoft/callback?code=c&state=${state}`,
			),
		);
		expect(page?.status).toBe(200);
		expect(page?.headers.get("content-type")).toContain("text/html");
		const body = (await (await waiting)?.json()) as { url: string };
		expect(new URL(body.url).searchParams.get("code")).toBe("c");
	});
});
