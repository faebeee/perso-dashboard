import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The web app is a personal, single-user tool that runs on your machine.
 * Its server listens on the OAuth loopback port so the redirect URIs you
 * registered for the desktop app work here too.
 */
export const WEB_HOST = "127.0.0.1";
/** Same as `OAUTH_LOOPBACK_PORT` in @dashboard/platform/services. */
export const WEB_PORT = 47390;

/** Hosts the browser may reach the server under (DNS-rebinding guard). */
export const ALLOWED_HOSTS = [
	`127.0.0.1:${WEB_PORT}`,
	`localhost:${WEB_PORT}`,
	`[::1]:${WEB_PORT}`,
];

/** Where the web app keeps its database and key. Override: DASHBOARD_DATA_DIR. */
export function dataDirectory(env = process.env): string {
	if (env.DASHBOARD_DATA_DIR) return env.DASHBOARD_DATA_DIR;
	const name = "local.productivity-dashboard-web";
	switch (process.platform) {
		case "darwin":
			return join(homedir(), "Library", "Application Support", name);
		case "win32":
			return join(env.APPDATA ?? join(homedir(), "AppData", "Roaming"), name);
		default:
			return join(
				env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
				name,
			);
	}
}
