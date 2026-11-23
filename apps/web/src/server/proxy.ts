import { isAllowedProviderUrl } from "@dashboard/platform/http-allowlist";

/** Header carrying the provider URL the browser wants to call. */
export const TARGET_HEADER = "x-dashboard-target";
/**
 * Header carrying the provider request's method. Calls to the proxy itself
 * are always POST (like the rest of the host API), whatever the provider
 * request is.
 */
export const METHOD_HEADER = "x-dashboard-method";

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];

const MAX_REDIRECTS = 5;

/** Request headers that belong to the browser ↔ server hop, not the API. */
const DROPPED_REQUEST_HEADERS = [
	"host",
	"origin",
	"referer",
	"cookie",
	"connection",
	"content-length",
	"accept-encoding",
	"user-agent",
	"priority",
	"dnt",
];

/** fetch decodes the body, so the encoding headers no longer apply. */
const DROPPED_RESPONSE_HEADERS = [
	"content-encoding",
	"content-length",
	"transfer-encoding",
	"connection",
	"set-cookie",
];

/** GitHub rejects requests without one; matches what a native client sends. */
const USER_AGENT = "productivity-dashboard";

/**
 * The web counterpart of Tauri's HTTP plugin: the browser can't call
 * provider APIs or token endpoints itself (CORS), so it sends them here.
 * Only URLs on the shared allowlist go out, redirects included.
 */
export async function proxyProviderRequest(
	request: Request,
	fetchFn: typeof fetch = fetch,
): Promise<Response> {
	let target = request.headers.get(TARGET_HEADER) ?? "";
	if (!isAllowedProviderUrl(target)) {
		return new Response(`Not an allowed provider URL: ${target}`, {
			status: 403,
		});
	}

	const headers = new Headers();
	for (const [name, value] of request.headers) {
		const lower = name.toLowerCase();
		if (
			DROPPED_REQUEST_HEADERS.includes(lower) ||
			lower.startsWith("sec-") ||
			lower.startsWith("x-dashboard-")
		) {
			continue;
		}
		headers.set(name, value);
	}
	headers.set("user-agent", USER_AGENT);

	let method = (request.headers.get(METHOD_HEADER) ?? "GET").toUpperCase();
	if (!METHODS.includes(method)) {
		return new Response(`Unsupported method: ${method}`, { status: 400 });
	}
	let body: ArrayBuffer | undefined =
		method === "GET" || method === "HEAD"
			? undefined
			: await request.arrayBuffer();

	for (let hop = 0; ; hop++) {
		const upstream = await fetchFn(target, {
			method,
			headers,
			body,
			redirect: "manual",
			signal: request.signal,
		});
		const location = upstream.headers.get("location");
		if (upstream.status >= 300 && upstream.status < 400 && location) {
			if (hop >= MAX_REDIRECTS) {
				return new Response("Too many redirects", { status: 502 });
			}
			target = new URL(location, target).toString();
			if (!isAllowedProviderUrl(target)) {
				return new Response(`Redirect to a disallowed URL: ${target}`, {
					status: 502,
				});
			}
			// 303 (and 301/302 after a POST, like browsers do) switch to GET.
			if (
				upstream.status === 303 ||
				((upstream.status === 301 || upstream.status === 302) &&
					method === "POST")
			) {
				method = "GET";
				body = undefined;
				headers.delete("content-type");
			}
			continue;
		}
		return relay(upstream);
	}
}

function relay(upstream: Response): Response {
	const headers = new Headers(upstream.headers);
	for (const name of DROPPED_RESPONSE_HEADERS) headers.delete(name);
	const nullBody = [101, 204, 205, 304].includes(upstream.status);
	return new Response(nullBody ? null : upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers,
	});
}
