import "@tanstack/react-start/server-only";
import { Google } from "arctic";
import type { OAuthProvider } from "#/core/oauth";
import type { OAuthClientCredentials } from "../env";
import { fromArcticTokens } from "./arctic";

/**
 * Google OAuth (PKCE + offline access). Shared by every Google-based
 * integration so they don't have to import each other.
 */
export function createGoogleOAuth(
	creds: OAuthClientCredentials,
	redirectUri: string,
	scopes: string[],
): OAuthProvider {
	const client = new Google(creds.clientId, creds.clientSecret, redirectUri);
	return {
		createAuthorizationUrl: ({ state, codeVerifier }) => {
			const url = client.createAuthorizationURL(state, codeVerifier, scopes);
			url.searchParams.set("access_type", "offline");
			// Always show consent so Google re-issues a refresh token on reconnect.
			url.searchParams.set("prompt", "consent");
			return url;
		},
		exchangeCode: async ({ code, codeVerifier }) =>
			fromArcticTokens(
				await client.validateAuthorizationCode(code, codeVerifier),
				scopes,
			),
		refresh: async (refreshToken) =>
			fromArcticTokens(await client.refreshAccessToken(refreshToken), scopes),
	};
}
