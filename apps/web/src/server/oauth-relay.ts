/**
 * The web counterpart of the desktop's loopback listener
 * (`src-tauri/src/oauth_loopback.rs`). The provider redirects the login tab
 * to `/oauth/<id>/callback` on this server; the app, which keeps the PKCE
 * verifier in memory, long-polls for that redirect by its `state`.
 *
 * A relay through the server (rather than `window.opener`) keeps working
 * when the provider's pages cut the opener (COOP) and when the redirect
 * comes back on `localhost` instead of `127.0.0.1` (Microsoft).
 */
export interface OAuthRelay {
	/** Called by the callback route. False when nobody is waiting for it. */
	deliver(redirectUrl: URL): boolean;
	/** Starts waiting for `state`; until then callbacks are refused. */
	expect(state: string, timeoutMs: number): void;
	/**
	 * Resolves with the redirect URL, or null if none arrived within
	 * `pollMs` (the caller polls again). Rejects with "cancelled"/"timeout".
	 */
	wait(state: string, pollMs: number): Promise<URL | null>;
	cancel(state: string): void;
}

type Outcome =
	| { kind: "redirect"; url: URL }
	| { kind: "cancelled" }
	| { kind: "timeout" };

interface Pending {
	expiresAt: number;
	outcome?: Outcome;
	listeners: Set<(outcome: Outcome) => void>;
}

export class OAuthRelayError extends Error {
	constructor(readonly kind: "cancelled" | "timeout" | "unknown") {
		super(kind);
		this.name = "OAuthRelayError";
	}
}

export function createOAuthRelay(now = () => Date.now()): OAuthRelay {
	const pending = new Map<string, Pending>();

	const settle = (state: string, outcome: Outcome) => {
		const entry = pending.get(state);
		if (!entry || entry.outcome) return;
		entry.outcome = outcome;
		for (const listener of entry.listeners) listener(outcome);
		entry.listeners.clear();
		// Keep the outcome briefly for a poll that is just reconnecting.
		setTimeout(() => pending.delete(state), 30_000).unref?.();
	};

	const sweep = () => {
		for (const [state, entry] of pending) {
			if (!entry.outcome && entry.expiresAt <= now()) {
				settle(state, { kind: "timeout" });
			}
		}
	};

	return {
		expect(state, timeoutMs) {
			sweep();
			pending.set(state, {
				expiresAt: now() + timeoutMs,
				listeners: new Set(),
			});
		},

		deliver(redirectUrl) {
			const state = redirectUrl.searchParams.get("state");
			const entry = state ? pending.get(state) : undefined;
			if (!state || !entry || entry.outcome) return false;
			settle(state, { kind: "redirect", url: redirectUrl });
			return true;
		},

		wait(state, pollMs) {
			sweep();
			const entry = pending.get(state);
			if (!entry) return Promise.reject(new OAuthRelayError("unknown"));
			const toResult = (outcome: Outcome) => {
				if (outcome.kind === "redirect") return outcome.url;
				throw new OAuthRelayError(outcome.kind);
			};
			if (entry.outcome) {
				try {
					return Promise.resolve(toResult(entry.outcome));
				} catch (cause) {
					return Promise.reject(cause);
				}
			}
			return new Promise<URL | null>((resolve, reject) => {
				const wait = Math.max(0, Math.min(pollMs, entry.expiresAt - now()));
				const timer = setTimeout(() => {
					entry.listeners.delete(listener);
					if (entry.expiresAt <= now()) {
						settle(state, { kind: "timeout" });
						reject(new OAuthRelayError("timeout"));
					} else {
						resolve(null);
					}
				}, wait);
				const listener = (outcome: Outcome) => {
					clearTimeout(timer);
					try {
						resolve(toResult(outcome));
					} catch (cause) {
						reject(cause);
					}
				};
				entry.listeners.add(listener);
			});
		},

		cancel(state) {
			settle(state, { kind: "cancelled" });
		},
	};
}
