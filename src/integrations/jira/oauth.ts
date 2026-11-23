import "@tanstack/react-start/server-only";
import { Atlassian } from "arctic";
import type { OAuthProvider } from "#/core/oauth";
import type { OAuthClientCredentials } from "#/server/env";
import { fromArcticTokens } from "#/server/oauth/arctic";
import { JIRA_SCOPES } from "./constants";

/** Atlassian OAuth 2.0 (3LO). Refresh tokens rotate on every refresh. */
export function createJiraOAuth(
	creds: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider {
	const client = new Atlassian(creds.clientId, creds.clientSecret, redirectUri);
	return {
		createAuthorizationUrl: ({ state }) =>
			client.createAuthorizationURL(state, JIRA_SCOPES),
		exchangeCode: async ({ code }) =>
			fromArcticTokens(
				await client.validateAuthorizationCode(code),
				JIRA_SCOPES,
			),
		refresh: async (refreshToken) =>
			fromArcticTokens(
				await client.refreshAccessToken(refreshToken),
				JIRA_SCOPES,
			),
	};
}
