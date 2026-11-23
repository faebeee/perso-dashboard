import type { z } from "zod";
import { IntegrationFailure } from "#/core/result";
import { type FetchFn, hostFetch } from "./host";

export type { FetchFn };

export interface HttpClientOptions {
	integrationId: string;
	baseUrl: string;
	accessToken: string;
	headers?: Record<string, string>;
	/** Defaults to the host's (CORS-free) fetch. Injectable for tests. */
	fetch?: FetchFn;
}

export interface HttpClient {
	get<T>(
		path: string,
		schema: z.ZodType<T>,
		query?: Record<string, string | number | string[] | undefined>,
	): Promise<T>;
}

/**
 * Minimal JSON-over-HTTP client shared by integrations. It adds bearer auth,
 * validates responses with zod and maps HTTP failures to typed
 * `IntegrationFailure`s.
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
	const fetchFn = options.fetch ?? hostFetch;
	const { integrationId } = options;

	return {
		async get(path, schema, query) {
			const url = new URL(path, options.baseUrl);
			for (const [key, value] of Object.entries(query ?? {})) {
				if (value === undefined) continue;
				for (const v of Array.isArray(value) ? value : [value]) {
					url.searchParams.append(key, String(v));
				}
			}

			let response: Response;
			try {
				response = await fetchFn(url, {
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${options.accessToken}`,
						...options.headers,
					},
				});
			} catch (cause) {
				throw new IntegrationFailure({
					kind: "network",
					integrationId,
					message: `Could not reach ${url.host}: ${(cause as Error).message}`,
				});
			}

			if (!response.ok) {
				throw await toFailure(response, integrationId);
			}

			const parsed = schema.safeParse(await response.json());
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
			response.headers.get("x-ratelimit-remaining") === "0");
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
	const reset = headers.get("x-ratelimit-reset");
	if (reset && /^\d+$/.test(reset)) {
		return Math.max(0, Number(reset) - Math.floor(Date.now() / 1000));
	}
	return undefined;
}
