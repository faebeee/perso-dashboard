import { IntegrationFailure } from "#/core/result";

/**
 * Response cache + rate-limit guard behind every integration's HTTP client.
 *
 * - Fresh entries (younger than the endpoint's TTL) are served without a
 *   request, so widgets, the feed and the urgent view share one fetch.
 * - Identical concurrent requests share one network call.
 * - Stale entries are revalidated with If-None-Match / If-Modified-Since
 *   (a 304 doesn't count against GitHub's rate limit).
 * - Rate-limit headers pause an API until its reset; meanwhile, and when the
 *   network fails, the last cached response is served instead of an error.
 */

export interface CacheEntry {
	body: string;
	etag?: string;
	lastModified?: string;
	/** When the body was last confirmed by the server (0 = force revalidation). */
	fetchedAt: number;
}

export interface CacheStore {
	get(key: string, integrationId: string): Promise<CacheEntry | null>;
	set(key: string, integrationId: string, entry: CacheEntry): Promise<void>;
	/** Marks entries stale (keeps them for revalidation and fallback). */
	expire(integrationId?: string): Promise<void>;
	/** Forgets an integration's responses (disconnect, other account). */
	clear(integrationId: string): Promise<void>;
}

export type SyncEvent =
	| { type: "synced"; integrationId: string; at: number }
	| {
			type: "stale";
			integrationId: string;
			/** Set when serving cache because the API is paused. */
			pausedUntil?: number;
			reason: "rate_limited" | "network" | "server";
	  }
	| { type: "paused"; integrationId: string; until: number };

export interface CachedRequest {
	integrationId: string;
	/** Rate-limit pool within the integration (GitHub: "search" vs "core"). */
	bucket: string;
	url: string;
	ttlMs: number;
	/** Performs the request with the given conditional headers. */
	send(conditional: Record<string, string>): Promise<Response>;
	/** Maps a failed response to a typed failure (rate_limited, unauthorized…). */
	toFailure(response: Response): Promise<IntegrationFailure>;
}

export interface HttpCache {
	/** Response body text: from cache when fresh, otherwise from the network. */
	get(request: CachedRequest): Promise<string>;
	expire(integrationId?: string): Promise<void>;
	clear(integrationId: string): Promise<void>;
}

/** Pause after a 429 without any reset hint. */
const DEFAULT_PAUSE_MS = 60_000;

export function createHttpCache(deps: {
	store: CacheStore;
	now?: () => number;
	onEvent?: (event: SyncEvent) => void;
}): HttpCache {
	const { store } = deps;
	const now = deps.now ?? Date.now;
	const emit = deps.onEvent ?? (() => {});
	const inflight = new Map<string, Promise<string>>();
	/** `${integrationId}:${bucket}` → epoch ms until which requests are paused. */
	const pausedUntil = new Map<string, number>();

	function pause(integrationId: string, bucket: string, until: number) {
		const key = `${integrationId}:${bucket}`;
		if ((pausedUntil.get(key) ?? 0) < until) {
			pausedUntil.set(key, until);
			emit({ type: "paused", integrationId, until });
		}
	}

	/** Proactively pause when the server says the pool is exhausted. */
	function observeLimits(request: CachedRequest, headers: Headers) {
		const remaining =
			headers.get("x-ratelimit-remaining") ??
			headers.get("x-sentry-rate-limit-remaining");
		const reset =
			headers.get("x-ratelimit-reset") ??
			headers.get("x-sentry-rate-limit-reset");
		if (
			remaining !== null &&
			Number(remaining) <= 0 &&
			reset &&
			/^\d+(\.\d+)?$/.test(reset)
		) {
			pause(request.integrationId, request.bucket, Number(reset) * 1000);
		}
	}

	async function load(request: CachedRequest, key: string): Promise<string> {
		const entry = await store.get(key, request.integrationId);
		const t = now();
		if (entry && t - entry.fetchedAt < request.ttlMs) return entry.body;

		const stale = (
			reason: "rate_limited" | "network" | "server",
			until?: number,
		) => {
			emit({
				type: "stale",
				integrationId: request.integrationId,
				reason,
				pausedUntil: until,
			});
			return (entry as CacheEntry).body;
		};

		const blocked =
			pausedUntil.get(`${request.integrationId}:${request.bucket}`) ?? 0;
		if (blocked > t) {
			if (entry) return stale("rate_limited", blocked);
			throw new IntegrationFailure({
				kind: "rate_limited",
				integrationId: request.integrationId,
				message: "Rate limit reached. Waiting for it to reset.",
				retryAfter: Math.ceil((blocked - t) / 1000),
			});
		}

		const conditional: Record<string, string> = {};
		if (entry?.etag) conditional["If-None-Match"] = entry.etag;
		if (entry?.lastModified)
			conditional["If-Modified-Since"] = entry.lastModified;

		let response: Response;
		try {
			response = await request.send(conditional);
		} catch (cause) {
			if (entry) return stale("network");
			throw cause;
		}
		observeLimits(request, response.headers);

		if (response.status === 304 && entry) {
			await store.set(key, request.integrationId, {
				...entry,
				fetchedAt: now(),
			});
			emit({ type: "synced", integrationId: request.integrationId, at: now() });
			return entry.body;
		}
		if (response.ok) {
			const body = await response.text();
			await store.set(key, request.integrationId, {
				body,
				etag: response.headers.get("etag") ?? undefined,
				lastModified: response.headers.get("last-modified") ?? undefined,
				fetchedAt: now(),
			});
			emit({ type: "synced", integrationId: request.integrationId, at: now() });
			return body;
		}

		const failure = await request.toFailure(response);
		if (failure.error.kind === "rate_limited") {
			const until =
				now() +
				(failure.error.retryAfter
					? failure.error.retryAfter * 1000
					: DEFAULT_PAUSE_MS);
			pause(request.integrationId, request.bucket, until);
			if (entry) return stale("rate_limited", until);
		} else if (entry && response.status >= 500) {
			return stale("server");
		}
		throw failure;
	}

	return {
		get(request) {
			const key = `${request.integrationId} ${request.url}`;
			const pending = inflight.get(key);
			if (pending) return pending;
			const promise = load(request, key).finally(() => inflight.delete(key));
			inflight.set(key, promise);
			return promise;
		},
		expire: (integrationId) => store.expire(integrationId),
		clear: (integrationId) => store.clear(integrationId),
	};
}

/** In-memory store; also the fast front layer of the persistent one. */
export function createMemoryCacheStore(): CacheStore & {
	entries: Map<string, { integrationId: string; entry: CacheEntry }>;
} {
	const entries = new Map<
		string,
		{ integrationId: string; entry: CacheEntry }
	>();
	return {
		entries,
		async get(key) {
			return entries.get(key)?.entry ?? null;
		},
		async set(key, integrationId, entry) {
			entries.set(key, { integrationId, entry });
		},
		async expire(integrationId) {
			for (const value of entries.values()) {
				if (!integrationId || value.integrationId === integrationId) {
					value.entry = { ...value.entry, fetchedAt: 0 };
				}
			}
		},
		async clear(integrationId) {
			for (const [key, value] of entries) {
				if (value.integrationId === integrationId) entries.delete(key);
			}
		},
	};
}

/**
 * Memory in front of a persistent store: reads hit memory first, writes go
 * to both (persistence failures are logged, never fatal).
 */
export function layeredCacheStore(
	memory: CacheStore,
	persistent: CacheStore,
): CacheStore {
	const persist = (work: Promise<void>) =>
		work.catch((cause) => console.error("[cache] persist failed", cause));
	return {
		async get(key, integrationId) {
			const hit = await memory.get(key, integrationId);
			if (hit) return hit;
			// Not in memory: one (decrypting) read from disk, then remembered.
			const stored = await persistent.get(key, integrationId).catch(() => null);
			if (stored) await memory.set(key, integrationId, stored);
			return stored;
		},
		async set(key, integrationId, entry) {
			await memory.set(key, integrationId, entry);
			void persist(persistent.set(key, integrationId, entry));
		},
		async expire(integrationId) {
			await memory.expire(integrationId);
			await persist(persistent.expire(integrationId));
		},
		async clear(integrationId) {
			await memory.clear(integrationId);
			await persist(persistent.clear(integrationId));
		},
	};
}
