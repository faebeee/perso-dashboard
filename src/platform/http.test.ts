import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createHttpClient, type FetchFn } from "./http";

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
