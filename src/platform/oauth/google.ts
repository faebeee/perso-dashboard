import type { OAuthClientCredentials, OAuthProvider } from "#/core/oauth";
import { createOAuth2Provider } from "./oauth2-client";

/** Shared by every Google-based integration so they don't import each other. */
export const GOOGLE_OAUTH_CLIENT = {
	id: "google",
	label: "Google OAuth client",
} as const;

/**
 * Google OAuth for installed apps: PKCE + loopback redirect + offline access.
 * Use a "Desktop app" OAuth client, which accepts any 127.0.0.1 port.
 */
export function createGoogleOAuth(
	credentials: OAuthClientCredentials,
	redirectUri: string,
	scopes: string[],
): OAuthProvider {
	return createOAuth2Provider({
		authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenEndpoint: "https://oauth2.googleapis.com/token",
		credentials,
		redirectUri,
		scopes,
		pkce: true,
		authorizationParams: {
			access_type: "offline",
			// Always show consent so Google re-issues a refresh token on reconnect.
			prompt: "consent",
		},
	});
}
