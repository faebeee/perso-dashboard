import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";
import Database from "@tauri-apps/plugin-sql";
import type { SqlDriver } from "../db/driver";
import { fromBase64Url } from "../encoding";
import {
	BrowserAuthError,
	type BrowserAuthErrorKind,
	type Host,
} from "../host";
import { createTauriDesktopShell } from "./desktop";
import { withoutOrigin } from "./fetch";

/**
 * Host implementation for the Tauri shell. The only module that imports
 * `@tauri-apps/*`; the Rust side lives in `src-tauri/src/`.
 */

/** Relative to the app's config directory (see tauri-plugin-sql). */
const DATABASE_URL = "sqlite:dashboard.db";

export interface TauriHostOptions {
	/** In-app navigation, used by native menus (tray). */
	navigate: (path: string) => void;
}

export function createTauriHost({ navigate }: TauriHostOptions): Host {
	const openExternal = (url: string) => openUrl(url);
	return {
		fetch: withoutOrigin(tauriFetch),

		async openDatabase() {
			return createPluginSqlDriver(await Database.load(DATABASE_URL));
		},

		async loadEncryptionKey() {
			return fromBase64Url(await invoke<string>("encryption_key"));
		},

		async authorizeInBrowser({ url, port, callbackPath, timeoutSeconds }) {
			try {
				const redirect = await invoke<string>("oauth_authorize", {
					url: url.toString(),
					port,
					path: callbackPath,
					timeoutSecs: timeoutSeconds,
				});
				return new URL(redirect);
			} catch (cause) {
				throw toBrowserAuthError(cause);
			}
		},

		async cancelAuthorization() {
			await invoke("oauth_cancel");
		},

		openExternal,

		desktop: createTauriDesktopShell({ navigate, openExternal }),
	};
}

function createPluginSqlDriver(db: Database): SqlDriver {
	return {
		async execute(sql, params) {
			await db.execute(sql, params);
		},
		async select(sql, params) {
			// The plugin returns objects keyed by column, in SELECT order.
			const rows = await db.select<Record<string, unknown>[]>(sql, params);
			return rows.map((row) => Object.values(row));
		},
	};
}

/** Rust serializes errors as `{ kind, message }`, see oauth_loopback.rs. */
function toBrowserAuthError(cause: unknown): BrowserAuthError {
	const kinds: BrowserAuthErrorKind[] = [
		"cancelled",
		"timeout",
		"port_unavailable",
		"browser",
		"io",
	];
	if (typeof cause === "object" && cause !== null && "kind" in cause) {
		const { kind, message } = cause as { kind: string; message?: string };
		if (kinds.includes(kind as BrowserAuthErrorKind)) {
			return new BrowserAuthError(
				kind as BrowserAuthErrorKind,
				message ?? kind,
			);
		}
	}
	return new BrowserAuthError("io", String(cause));
}
