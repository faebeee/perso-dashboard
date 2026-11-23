import "@tanstack/react-start/server-only";
import { GitHub } from "arctic";
import type { OAuthProvider } from "#/core/oauth";
import type { OAuthClientCredentials } from "#/server/env";
import { fromArcticTokens } from "#/server/oauth/arctic";
import { GITHUB_SCOPES } from "./constants";

/** GitHub OAuth App. No PKCE, and tokens don't expire, so there's no refresh. */
export function createGitHubOAuth(
	creds: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider {
	const client = new GitHub(creds.clientId, creds.clientSecret, redirectUri);
	return {
		createAuthorizationUrl: ({ state }) =>
			client.createAuthorizationURL(state, GITHUB_SCOPES),
		exchangeCode: async ({ code }) =>
			fromArcticTokens(
				await client.validateAuthorizationCode(code),
				GITHUB_SCOPES,
			),
	};
}
