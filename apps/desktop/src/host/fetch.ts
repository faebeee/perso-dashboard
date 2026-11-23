import type { FetchFn } from "@dashboard/platform/host";

/**
 * The Tauri HTTP plugin adds the webview's origin (http://127.0.0.1:3100 in
 * dev, tauri://localhost when packaged) as an `Origin` header to every
 * request. Some APIs reject unknown origins (Sentry: "Invalid origin"), and
 * for a native app calling an API the header is meaningless anyway.
 *
 * With the plugin's `unsafe-headers` feature (src-tauri/Cargo.toml), an empty
 * `Origin` tells it to send none.
 */
export function withoutOrigin(fetchFn: FetchFn): FetchFn {
	return (input, init) => {
		const headers = new Headers(init?.headers);
		headers.set("Origin", "");
		return fetchFn(input, { ...init, headers });
	};
}
