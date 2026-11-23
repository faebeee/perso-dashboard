import type { SqlDriver } from "./db/driver";

export type FetchFn = typeof fetch;

/**
 * Everything the app needs from the machine it runs on. The rest of
 * `platform/` depends only on this port; `platform/tauri/` adapts it to
 * Tauri. Another shell (Electron, a test harness…) only has to implement
 * this interface.
 */
export interface Host {
	/** fetch without browser CORS restrictions (provider APIs, token endpoints). */
	fetch: FetchFn;
	/** Opens the local SQLite database (migrations are applied by the caller). */
	openDatabase(): Promise<SqlDriver>;
	/** 32-byte key for encrypting secrets at rest, created on first use. */
	loadEncryptionKey(): Promise<Uint8Array>;
	/**
	 * Opens `url` in the system browser and waits on the loopback listener
	 * (127.0.0.1:`port`) for the provider's redirect to `callbackPath`.
	 * Resolves with the full redirect URL, including `code`/`state`.
	 */
	authorizeInBrowser(input: {
		url: URL;
		port: number;
		callbackPath: string;
		timeoutSeconds: number;
	}): Promise<URL>;
	/** Aborts a pending `authorizeInBrowser` (it rejects with "cancelled"). */
	cancelAuthorization(): Promise<void>;
	/** Opens a link in the system browser instead of the app window. */
	openExternal(url: string): Promise<void>;
}

/** Failure kinds of `Host.authorizeInBrowser`. */
export type BrowserAuthErrorKind =
	| "cancelled"
	| "timeout"
	| "port_unavailable"
	| "browser"
	| "io";

export class BrowserAuthError extends Error {
	readonly kind: BrowserAuthErrorKind;

	constructor(kind: BrowserAuthErrorKind, message: string) {
		super(message);
		this.name = "BrowserAuthError";
		this.kind = kind;
	}
}

let current: Host | undefined;

/** Called once by the app entry point, before anything touches the platform. */
export function setHost(host: Host): void {
	current = host;
}

export function getHost(): Host {
	if (!current) {
		throw new Error("No host configured. Call setHost() at startup.");
	}
	return current;
}

/** fetch that goes through the host. Resolved lazily so tests can inject their own. */
export const hostFetch: FetchFn = (input, init) => getHost().fetch(input, init);
