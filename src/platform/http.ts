import type { z } from "zod";
import { IntegrationFailure } from "#/core/result";
import { type FetchFn, hostFetch } from "./host";
import type { HttpCache } from "./http-cache";

export type { FetchFn };

export interface HttpClientOptions {
	integrationId: string;
	baseUrl: string;
	accessToken: string;
	headers?: Record<string, string>;
	/** Defaults to the host's (CORS-free) fetch. Injectable for tests. */
	fetch?: FetchFn;
	/**
	 * How long a response stays fresh (ms), per URL. Within it, repeat
	 * requests are served from cache. Defaults to DEFAULT_TTL_MS.
	 */
	ttl?: number | ((url: URL) => number);
	/** Rate-limit pool a URL belongs to (GitHub: "search" vs "core"). */
	rateLimitBucket?: (url: URL) => string;
	/** Defaults to the app-wide cache (see setDefaultHttpCache); none in tests. */
	cache?: HttpCache | null;
}

export interface HttpClient {
	get<T>(
		path: string,
		schema: z.ZodType<T>,
		query?: Record<string, string | number | string[] | undefined>,
		/** Extra request headers (e.g. an Accept variant); part of the cache key. */
		init?: { headers?: Record<string, string> },
	): Promise<T>;
}

export const DEFAULT_TTL_MS = 60_000;

let defaultCache: HttpCache | null = null;

/** Set once by the composition root (platform/services.ts). */
export function setDefaultHttpCache(cache: HttpCache | null): void {
	defaultCache = cache;
}

/**
 * Minimal JSON-over-HTTP client shared by integrations. It adds bearer auth,
 * caches and deduplicates GETs (see http-cache.ts), validates responses with
 * zod and maps HTTP failures to typed `IntegrationFailure`s.
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
	const fetchFn = options.fetch ?? hostFetch;
	const { integrationId } = options;
	// Injected fetch (tests) means "talk to this fetch", not to a shared cache.
	const cache =
		options.cache !== undefined
			? options.cache
			: options.fetch
				? null
				: defaultCache;

	const send = async (
		url: URL,
		extra: Record<string, string>,
		conditional: Record<string, string> = {},
	) => {
		try {
			return await fetchFn(url, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${options.accessToken}`,
					...options.headers,
					...extra,
					...conditional,
				},
			});
		} catch (cause) {
			throw new IntegrationFailure({
				kind: "network",
				integrationId,
				message: `Could not reach ${url.host}: ${(cause as Error).message}`,
			});
		}
	};

	async function loadText(
		url: URL,
		extra: Record<string, string>,
	): Promise<string> {
		if (cache) {
			const ttl =
				typeof options.ttl === "function"
					? options.ttl(url)
					: (options.ttl ?? DEFAULT_TTL_MS);
			return cache.get({
				integrationId,
				bucket: options.rateLimitBucket?.(url) ?? "default",
				// Header variants (e.g. Accept) are different responses.
				url:
					Object.keys(extra).length > 0
						? `${url.toString()} ${JSON.stringify(extra)}`
						: url.toString(),
				ttlMs: ttl,
				send: (conditional) => send(url, extra, conditional),
				toFailure: (response) => toFailure(response, integrationId),
			});
		}
		const response = await send(url, extra);
		if (!response.ok) throw await toFailure(response, integrationId);
		return response.text();
	}

	return {
		async get(path, schema, query, init) {
			const url = new URL(path, options.baseUrl);
			for (const [key, value] of Object.entries(query ?? {})) {
				if (value === undefined) continue;
				for (const v of Array.isArray(value) ? value : [value]) {
					url.searchParams.append(key, String(v));
				}
			}

			const text = await loadText(url, init?.headers ?? {});
			let json: unknown;
			try {
				json = JSON.parse(text);
			} catch {
				json = undefined;
			}
			const parsed = schema.safeParse(json);
			if (!parsed.success) {
				throw new IntegrationFailure({
					kind: "unknown",
					integrationId,
					message: `Unexpected response shape from ${url.pathname}`,
				});
			}
			return parsed.data;
		},
	};
}

async function toFailure(
	response: Response,
	integrationId: string,
): Promise<IntegrationFailure> {
	const body = await response.text().catch(() => "");
	const detail = body.slice(0, 200);

	if (response.status === 401) {
		return new IntegrationFailure({
			kind: "unauthorized",
			integrationId,
			message: "Access was revoked or expired. Reconnect the account.",
		});
	}

	const rateLimited =
		response.status === 429 ||
		(response.status === 403 &&
			(response.headers.get("x-ratelimit-remaining") === "0" ||
				// Google APIs report quota errors as 403 with a reason.
				/rateLimitExceeded|userRateLimitExceeded|quotaExceeded/.test(body) ||
				// GitHub's secondary rate limit.
				/secondary rate limit/i.test(body)));
	if (rateLimited) {
		return new IntegrationFailure({
			kind: "rate_limited",
			integrationId,
			message: "Rate limit reached. Try again later.",
			retryAfter: retryAfterSeconds(response.headers),
		});
	}

	return new IntegrationFailure({
		kind: "unknown",
		integrationId,
		message: `Request failed with ${response.status}${detail ? `: ${detail}` : ""}`,
	});
}

function retryAfterSeconds(headers: Headers): number | undefined {
	const retryAfter = headers.get("retry-after");
	if (retryAfter && /^\d+$/.test(retryAfter)) return Number(retryAfter);
	if (retryAfter) {
		const date = Date.parse(retryAfter); // HTTP-date form
		if (!Number.isNaN(date))
			return Math.max(0, Math.ceil((date - Date.now()) / 1000));
	}
	const reset =
		headers.get("x-ratelimit-reset") ??
		headers.get("x-sentry-rate-limit-reset");
	if (reset && /^\d+$/.test(reset)) {
		return Math.max(0, Number(reset) - Math.floor(Date.now() / 1000));
	}
	return undefined;
}
