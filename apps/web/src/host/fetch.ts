import type { FetchFn } from "@dashboard/platform/host";
import { HOST_API_HEADERS, HOST_API_PREFIX } from "./api";

/** Must match `TARGET_HEADER` in `src/server/proxy.ts`. */
const TARGET_HEADER = "x-dashboard-target";
/** Must match `METHOD_HEADER` in `src/server/proxy.ts`. */
const METHOD_HEADER = "x-dashboard-method";

/**
 * fetch for provider APIs and token endpoints, through the server's proxy
 * (browsers can't call them directly: CORS). Returns the provider's own
 * status, headers and body, so the HTTP client and its cache can't tell the
 * difference from a direct call.
 */
export function createProxyFetch(fetchFn: FetchFn = fetch): FetchFn {
	return async (input, init) => {
		const request = new Request(input, init);
		const headers = new Headers(request.headers);
		for (const [name, value] of Object.entries(HOST_API_HEADERS)) {
			headers.set(name, value);
		}
		headers.set(TARGET_HEADER, request.url);
		headers.set(METHOD_HEADER, request.method);
		const hasBody = request.method !== "GET" && request.method !== "HEAD";
		return fetchFn(`${HOST_API_PREFIX}fetch`, {
			// The host API only takes POST; the provider's method travels in a header.
			method: "POST",
			headers,
			body: hasBody ? await request.arrayBuffer() : undefined,
			signal: init?.signal ?? request.signal,
			// Never let the browser's HTTP cache answer: the app has its own.
			cache: "no-store",
			credentials: "same-origin",
		});
	};
}
