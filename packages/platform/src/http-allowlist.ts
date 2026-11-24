/**
 * The only URLs the app may call: provider APIs and OAuth token endpoints.
 * Patterns use Tauri's syntax (`*` matches anything, including `/`).
 *
 * Enforced by the desktop app's HTTP capability
 * (`apps/desktop/src-tauri/capabilities/default.json`, kept in sync by a
 * test). Adding an integration means adding its hosts here and there.
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
