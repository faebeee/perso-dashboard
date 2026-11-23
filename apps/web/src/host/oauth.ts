import {
	BrowserAuthError,
	type BrowserAuthErrorKind,
	type Host,
} from "@dashboard/platform/host";
import { postHostApi } from "./api";

type Authorize = Host["authorizeInBrowser"];

/**
 * The browser half of the OAuth loopback: opens the provider's login in a
 * new tab and waits for the server to receive the redirect (see
 * `src/server/oauth-relay.ts`). The server listens on the same port as the
 * desktop's loopback listener, so the same redirect URIs work.
 */
export function createBrowserOAuth(): {
	authorizeInBrowser: Authorize;
	cancelAuthorization: Host["cancelAuthorization"];
} {
	let current: { state: string; abort: AbortController } | undefined;

	const cancel = async () => {
		const flow = current;
		current = undefined;
		if (!flow) return;
		flow.abort.abort();
		await postHostApi("oauth/cancel", { state: flow.state }).catch(() => {});
	};

	const authorizeInBrowser: Authorize = async ({ url, timeoutSeconds }) => {
		const state = url.searchParams.get("state");
		if (!state)
			throw new BrowserAuthError("io", "Authorization URL has no state");
		await cancel();
		const flow = { state, abort: new AbortController() };
		current = flow;

		await postHostApi("oauth/expect", { state, timeoutSeconds });

		const tab = window.open(url.toString(), "_blank");
		if (!tab) {
			current = undefined;
			await postHostApi("oauth/cancel", { state }).catch(() => {});
			throw new BrowserAuthError(
				"browser",
				"The login page was blocked as a pop-up. Allow pop-ups for this page and try again.",
			);
		}
		tab.opener = null;

		try {
			for (;;) {
				const response = await postHostApi(
					"oauth/wait",
					{ state },
					{ signal: flow.abort.signal },
				);
				if (response.status === 204) continue; // still waiting
				const body = (await response.json()) as { url?: string; kind?: string };
				if (body.url) return new URL(body.url);
				throw new BrowserAuthError(
					toKind(body.kind),
					body.kind === "timeout" ? "Login timed out" : "Login was cancelled",
				);
			}
		} catch (cause) {
			if (cause instanceof BrowserAuthError) throw cause;
			if (flow.abort.signal.aborted) {
				throw new BrowserAuthError("cancelled", "Login was cancelled");
			}
			throw new BrowserAuthError("io", String(cause));
		} finally {
			if (current === flow) current = undefined;
		}
	};

	return { authorizeInBrowser, cancelAuthorization: cancel };
}

function toKind(kind: string | undefined): BrowserAuthErrorKind {
	return kind === "timeout"
		? "timeout"
		: kind === "cancelled"
			? "cancelled"
			: "io";
}
