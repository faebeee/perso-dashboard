import { fromBase64Url } from "@dashboard/platform/encoding";
import type { Host } from "@dashboard/platform/host";
import { postHostApiJson } from "./api";
import { createBrowserShell } from "./desktop";
import { createProxyFetch } from "./fetch";
import { createBrowserOAuth } from "./oauth";
import { createRemoteSqlDriver } from "./sql";

/**
 * Host implementation for the web app: browser APIs where they suffice, the
 * app's local server (`src/server/`) for what a page can't do on its own.
 */
export function createWebHost(): Host {
	const oauth = createBrowserOAuth();
	return {
		fetch: createProxyFetch(),

		async openDatabase() {
			return createRemoteSqlDriver();
		},

		async loadEncryptionKey() {
			const { key } = await postHostApiJson<{ key: string }>("key", {});
			return fromBase64Url(key);
		},

		authorizeInBrowser: oauth.authorizeInBrowser,
		cancelAuthorization: oauth.cancelAuthorization,

		async openExternal(url) {
			window.open(url, "_blank", "noopener,noreferrer");
		},

		desktop: createBrowserShell(),
	};
}
