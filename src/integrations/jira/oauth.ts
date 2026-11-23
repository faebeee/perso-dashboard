import type { OAuthClientCredentials, OAuthProvider } from "#/core/oauth";
import { createOAuth2Provider } from "#/platform/oauth/oauth2-client";
import { JIRA_SCOPES } from "./constants";

export const ATLASSIAN_OAUTH_CLIENT = {
	id: "atlassian",
	label: "Atlassian OAuth 2.0 (3LO) app",
} as const;

/**
 * Atlassian OAuth 2.0 (3LO). The redirect URI must match the registered one
 * exactly (port included). Refresh tokens rotate on every refresh.
 */
export function createJiraOAuth(
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider {
	return createOAuth2Provider({
		authorizationEndpoint: "https://auth.atlassian.com/authorize",
		tokenEndpoint: "https://auth.atlassian.com/oauth/token",
		credentials,
		redirectUri,
		scopes: JIRA_SCOPES,
		pkce: false,
		authorizationParams: { audience: "api.atlassian.com", prompt: "consent" },
	});
}
