import { ALLOWED_HOSTS } from "./config";

/** Header the browser host adds to every host API call. */
export const HOST_API_HEADER = "x-dashboard-host";

/**
 * The host API hands out the encryption key, runs SQL and proxies
 * authenticated requests, so only the app's own pages may call it:
 *
 * - `Host` must be the loopback address (blocks DNS rebinding).
 * - A custom header forces a CORS preflight, which this server never
 *   answers, so other websites can't send these requests at all.
 * - Fetch metadata / Origin, when present, must say same-origin.
 *
 * Returns a rejection response, or null when the request may proceed.
 */
export function rejectForeignRequest(request: Request): Response | null {
	const host = request.headers.get("host") ?? "";
	if (!ALLOWED_HOSTS.includes(host)) {
		return forbidden("Unexpected Host header");
	}
	if (request.headers.get(HOST_API_HEADER) !== "1") {
		return forbidden("Missing host API header");
	}
	const site = request.headers.get("sec-fetch-site");
	if (site && site !== "same-origin") {
		return forbidden("Cross-site request");
	}
	const origin = request.headers.get("origin");
	if (origin && !ALLOWED_HOSTS.some((h) => origin === `http://${h}`)) {
		return forbidden("Unexpected Origin");
	}
	return null;
}

const forbidden = (reason: string) =>
	new Response(reason, {
		status: 403,
		headers: { "content-type": "text/plain" },
	});
