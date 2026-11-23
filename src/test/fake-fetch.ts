import { vi } from "vitest";
import type { FetchFn } from "#/platform/http";

/**
 * A fetch stub that answers by URL pathname. Use a function value to
 * vary the response per request (e.g. by id in the path).
 */
export function fakeFetch(
	routes: Record<string, unknown | ((url: URL) => unknown)>,
) {
	return vi.fn<FetchFn>(async (input) => {
		const url = new URL(String(input));
		const route = Object.entries(routes).find(([path]) =>
			path.endsWith("*")
				? url.pathname.startsWith(path.slice(0, -1))
				: url.pathname === path,
		);
		if (!route) return new Response("not found", { status: 404 });
		const body = typeof route[1] === "function" ? route[1](url) : route[1];
		return new Response(JSON.stringify(body), {
			headers: { "content-type": "application/json" },
		});
	});
}
