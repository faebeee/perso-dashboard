import type {
	OAuthClientCredentials,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createOAuth2Provider } from "@dashboard/platform/oauth/oauth2-client";
import { GITHUB_SCOPES } from "./constants";

export const GITHUB_OAUTH_CLIENT = {
	id: "github",
	label: "GitHub OAuth App",
} as const;

/**
 * GitHub OAuth App with PKCE. GitHub accepts any port for a registered
 * http://127.0.0.1 callback. OAuth App tokens don't expire, so the token
 * manager never calls refresh for them.
 */
export function createGitHubOAuth(
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider {
	return createOAuth2Provider({
		authorizationEndpoint: "https://github.com/login/oauth/authorize",
		tokenEndpoint: "https://github.com/login/oauth/access_token",
		credentials,
		redirectUri,
		scopes: GITHUB_SCOPES,
		pkce: true,
	});
}
