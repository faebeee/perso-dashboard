import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createHttpClient, type FetchFn } from "./http";
import { createHttpCache, createMemoryCacheStore } from "./http-cache";

const schema = z.object({ ok: z.boolean() });

function client(fetch: FetchFn) {
	return createHttpClient({
		integrationId: "test",
		baseUrl: "https://api.example.com",
		accessToken: "token-123",
		fetch,
	});
}

const json = (body: unknown, init?: ResponseInit) =>
	new Response(JSON.stringify(body), init);

describe("createHttpClient", () => {
	it("sends bearer auth and query params, validates the body", async () => {
		const fetch = vi.fn<FetchFn>(async () => json({ ok: true, extra: 1 }));
		const result = await client(fetch).get("/things", schema, {
			q: "a b",
			tags: ["x", "y"],
			skip: undefined,
		});

		expect(result).toEqual({ ok: true });
		const [url, init] = fetch.mock.calls[0] ?? [];
		expect(String(url)).toBe(
			"https://api.example.com/things?q=a+b&tags=x&tags=y",
		);
		expect((init?.headers as Record<string, string>).Authorization).toBe(
			"Bearer token-123",
		);
	});

	it.each([
		[401, {}, "unauthorized"],
		[429, { "retry-after": "30" }, "rate_limited"],
		[403, { "x-ratelimit-remaining": "0" }, "rate_limited"],
		[403, {}, "unknown"],
		[500, {}, "unknown"],
	])("maps HTTP %i to %s", async (status, headers, kind) => {
		const fetch = vi.fn<FetchFn>(async () => json({}, { status, headers }));
		await expect(client(fetch).get("/x", schema)).rejects.toMatchObject({
			error: { kind, integrationId: "test" },
		});
	});

	it("reports retryAfter for rate limits", async () => {
		const fetch = vi.fn<FetchFn>(async () =>
			json({}, { status: 429, headers: { "retry-after": "42" } }),
		);
		await expect(client(fetch).get("/x", schema)).rejects.toMatchObject({
			error: { retryAfter: 42 },
		});
	});

	it("maps network errors", async () => {
		const fetch = vi.fn<FetchFn>(async () => {
			throw new TypeError("fetch failed");
		});
		await expect(client(fetch).get("/x", schema)).rejects.toMatchObject({
			error: { kind: "network" },
		});
	});

	it("rejects unexpected response shapes", async () => {
		const fetch = vi.fn<FetchFn>(async () => json({ ok: "yes" }));
		await expect(client(fetch).get("/x", schema)).rejects.toMatchObject({
			error: { kind: "unknown", message: expect.stringMatching(/shape/) },
		});
	});
});

describe("createHttpClient rate limits and cache", () => {
	it("maps Google's 403 quota errors to rate_limited", async () => {
		const fetch = vi.fn<FetchFn>(async () =>
			json(
				{ error: { errors: [{ reason: "userRateLimitExceeded" }] } },
				{ status: 403 },
			),
		);
		await expect(client(fetch).get("/x", schema)).rejects.toMatchObject({
			error: { kind: "rate_limited" },
		});
	});

	it("goes through the cache with the client's TTL and rate-limit pool", async () => {
		const fetch = vi.fn<FetchFn>(async () => json({ ok: true }));
		const cache = createHttpCache({ store: createMemoryCacheStore() });
		const get = vi.spyOn(cache, "get");
		const http = createHttpClient({
			integrationId: "test",
			baseUrl: "https://api.example.com",
			accessToken: "t",
			fetch,
			cache,
			ttl: (url) => (url.pathname.startsWith("/search") ? 120_000 : 5_000),
			rateLimitBucket: (url) =>
				url.pathname.startsWith("/search") ? "search" : "core",
		});

		await http.get("/search", schema, { q: "a" });
		await http.get("/search", schema, { q: "a" });

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(get.mock.calls[0]?.[0]).toMatchObject({
			bucket: "search",
			ttlMs: 120_000,
			url: "https://api.example.com/search?q=a",
		});
	});
});

describe("secret hygiene", () => {
	it("never puts the access token into cache keys", async () => {
		const cache = createHttpCache({ store: createMemoryCacheStore() });
		const spy = vi.spyOn(cache, "get");
		const fetch = vi.fn<FetchFn>(async () => json({ ok: true }));
		await createHttpClient({
			integrationId: "test",
			baseUrl: "https://api.example.com",
			accessToken: "token-123",
			fetch,
			cache,
		}).get("/x", schema, { q: "a" });
		const request = spy.mock.calls[0]?.[0];
		expect(JSON.stringify({ ...request, send: undefined })).not.toContain(
			"token-123",
		);
	});

	it("names only the host when the network fails", async () => {
		const fetch = vi.fn<FetchFn>(async () => {
			throw new TypeError("connection reset");
		});
		await expect(
			client(fetch).get("/search", schema, { q: "secret topic" }),
		).rejects.toMatchObject({
			error: {
				kind: "network",
				message: "Could not reach api.example.com: connection reset",
			},
		});
	});

	it("keeps response bodies out of 401 messages and caps other details", async () => {
		const unauthorized = vi.fn<FetchFn>(
			async () => new Response("token-123 is invalid", { status: 401 }),
		);
		const error = await client(unauthorized)
			.get("/x", schema)
			.catch((e) => e.error);
		expect(error.message).not.toContain("token-123");

		const failing = vi.fn<FetchFn>(
			async () => new Response("x".repeat(500), { status: 500 }),
		);
		const failure = await client(failing)
			.get("/x", schema)
			.catch((e) => e.error);
		expect(failure.message.length).toBeLessThanOrEqual(
			"Request failed with 500: ".length + 200,
		);
	});
});
