/**
 * The only URLs the app may call: provider APIs and OAuth token endpoints.
 * Patterns use Tauri's syntax (`*` matches anything, including `/`).
 *
 * Enforced by each shell: the desktop app through its HTTP capability
 * (`apps/desktop/src-tauri/capabilities/default.json`, kept in sync by a
 * test), the web app by its server-side proxy. Adding an integration means
 * adding its hosts here and there.
 */
export const PROVIDER_URL_PATTERNS = [
	"https://github.com/login/oauth/access_token",
	"https://api.github.com/*",
	"https://auth.atlassian.com/oauth/token",
	"https://api.atlassian.com/*",
	"https://oauth2.googleapis.com/token",
	"https://gmail.googleapis.com/*",
	"https://www.googleapis.com/*",
	"https://login.microsoftonline.com/common/oauth2/v2.0/token",
	"https://graph.microsoft.com/*",
	"https://sentry.io/oauth/token/",
	"https://sentry.io/api/*",
	"https://*.sentry.io/api/*",
] as const;

const escapeRegExp = (text: string) =>
	text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const PATTERNS = PROVIDER_URL_PATTERNS.map(
	(pattern) =>
		new RegExp(`^${pattern.split("*").map(escapeRegExp).join("[^]*")}$`, "i"),
);

/** True when `url` is one the app is allowed to call. */
export function isAllowedProviderUrl(url: string | URL): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	// No credentials or odd ports smuggled into an otherwise allowed host.
	if (parsed.username || parsed.password || parsed.port) return false;
	const normalized = `${parsed.origin}${parsed.pathname}`;
	return PATTERNS.some((pattern) => pattern.test(normalized));
}
