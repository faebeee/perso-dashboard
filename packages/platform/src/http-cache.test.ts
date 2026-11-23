import { IntegrationFailure } from "@dashboard/core/result";
import { describe, expect, it, vi } from "vitest";
import {
	type CachedRequest,
	createHttpCache,
	createMemoryCacheStore,
	layeredCacheStore,
	type SyncEvent,
} from "./http-cache";

const ok = (body: string, headers: Record<string, string> = {}) =>
	new Response(body, { status: 200, headers });

function setup() {
	let t = 1_000_000;
	const store = createMemoryCacheStore();
	const events: SyncEvent[] = [];
	const cache = createHttpCache({
		store,
		now: () => t,
		onEvent: (e) => events.push(e),
	});
	const send = vi.fn<CachedRequest["send"]>();
	const request = (extra: Partial<CachedRequest> = {}): CachedRequest => ({
		integrationId: "github",
		bucket: "core",
		url: "https://api.github.com/x",
		ttlMs: 60_000,
		send,
		toFailure: async (response) =>
			new IntegrationFailure({
				kind: response.status === 429 ? "rate_limited" : "unknown",
				message: `HTTP ${response.status}`,
				retryAfter: response.status === 429 ? 30 : undefined,
			}),
		...extra,
	});
	return {
		cache,
		store,
		events,
		send,
		request,
		advance: (ms: number) => {
			t += ms;
		},
	};
}

describe("http cache", () => {
	it("serves fresh responses from cache and shares concurrent requests", async () => {
		const { cache, send, request } = setup();
		send.mockImplementation(async () => ok("a"));
		const [first, second] = await Promise.all([
			cache.get(request()),
			cache.get(request()),
		]);
		expect([first, second]).toEqual(["a", "a"]);
		await expect(cache.get(request())).resolves.toBe("a");
		expect(send).toHaveBeenCalledTimes(1);
	});

	it("revalidates stale entries conditionally and keeps the body on 304", async () => {
		const { cache, send, request, advance } = setup();
		send.mockResolvedValueOnce(ok("a", { etag: '"v1"' }));
		await cache.get(request());
		advance(61_000);
		send.mockResolvedValueOnce(new Response(null, { status: 304 }));
		await expect(cache.get(request())).resolves.toBe("a");
		expect(send).toHaveBeenLastCalledWith({ "If-None-Match": '"v1"' });
		// Confirmed fresh again: no request within the TTL.
		await cache.get(request());
		expect(send).toHaveBeenCalledTimes(2);
	});

	it("serves cached data when the network fails or the API rate-limits", async () => {
		const { cache, send, request, advance, events } = setup();
		send.mockResolvedValueOnce(ok("cached"));
		await cache.get(request());
		advance(61_000);
		send.mockRejectedValueOnce(new Error("offline"));
		await expect(cache.get(request())).resolves.toBe("cached");

		send.mockResolvedValueOnce(new Response("", { status: 429 }));
		await expect(cache.get(request())).resolves.toBe("cached");
		expect(events).toContainEqual(
			expect.objectContaining({ type: "paused", integrationId: "github" }),
		);
	});

	it("pauses an exhausted pool without calling it, other pools keep working", async () => {
		const { cache, send, request, advance } = setup();
		const resetSeconds = Math.floor((1_000_000 + 120_000) / 1000);
		send.mockResolvedValueOnce(
			ok("s", {
				"x-ratelimit-remaining": "0",
				"x-ratelimit-reset": String(resetSeconds),
			}),
		);
		await cache.get(
			request({ bucket: "search", url: "https://api.github.com/search?q=1" }),
		);

		// Same pool, other URL, nothing cached: fails fast without a request.
		await expect(
			cache.get(
				request({ bucket: "search", url: "https://api.github.com/search?q=2" }),
			),
		).rejects.toMatchObject({ error: { kind: "rate_limited" } });
		expect(send).toHaveBeenCalledTimes(1);

		// Another pool isn't affected.
		send.mockResolvedValueOnce(ok("core"));
		await expect(cache.get(request({ bucket: "core" }))).resolves.toBe("core");

		// After the reset, the paused pool works again.
		advance(121_000);
		send.mockResolvedValueOnce(ok("s2"));
		await expect(
			cache.get(
				request({ bucket: "search", url: "https://api.github.com/search?q=2" }),
			),
		).resolves.toBe("s2");
	});

	it("throws real errors when nothing is cached", async () => {
		const { cache, send, request } = setup();
		send.mockResolvedValueOnce(new Response("", { status: 500 }));
		await expect(cache.get(request())).rejects.toMatchObject({
			error: { kind: "unknown" },
		});
	});

	it("expire forces revalidation; clear forgets an integration", async () => {
		const { cache, send, request } = setup();
		send.mockImplementation(async () => ok("a"));
		await cache.get(request());
		await cache.expire("github");
		await cache.get(request());
		expect(send).toHaveBeenCalledTimes(2);

		await cache.clear("github");
		send.mockRejectedValueOnce(new Error("offline"));
		await expect(cache.get(request())).rejects.toThrow("offline");
	});
});

describe("layeredCacheStore", () => {
	it("reads through to the persistent store and remembers the entry", async () => {
		const memory = createMemoryCacheStore();
		const disk = createMemoryCacheStore();
		await disk.set("k", "github", { body: "b", fetchedAt: 1 });
		const layered = layeredCacheStore(memory, disk);
		await expect(layered.get("k", "github")).resolves.toMatchObject({
			body: "b",
		});
		expect(memory.entries.get("k")?.integrationId).toBe("github");
	});
});
