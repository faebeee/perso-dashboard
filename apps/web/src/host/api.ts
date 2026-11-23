/** Calls to the web app's own server (`src/server/host-api.ts`). */

/** Must match `HOST_API_HEADER` on the server; forces a CORS preflight for foreign pages. */
export const HOST_API_HEADERS = { "x-dashboard-host": "1" } as const;
export const HOST_API_PREFIX = "/api/host/";

export async function postHostApi(
	path: string,
	body: unknown,
	init: { signal?: AbortSignal } = {},
): Promise<Response> {
	const response = await fetch(`${HOST_API_PREFIX}${path}`, {
		method: "POST",
		headers: { ...HOST_API_HEADERS, "content-type": "application/json" },
		body: JSON.stringify(body),
		signal: init.signal,
	});
	if (
		response.status >= 500 ||
		response.status === 400 ||
		response.status === 403
	) {
		const detail = await response.text().catch(() => "");
		throw new Error(`Host API ${path} failed (${response.status}): ${detail}`);
	}
	return response;
}

export async function postHostApiJson<T>(
	path: string,
	body: unknown,
): Promise<T> {
	return (await postHostApi(path, body)).json() as Promise<T>;
}
