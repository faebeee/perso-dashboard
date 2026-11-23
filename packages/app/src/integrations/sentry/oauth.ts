import type {
	OAuthClientCredentials,
	OAuthProvider,
} from "@dashboard/core/oauth";
import { createOAuth2Provider } from "@dashboard/platform/oauth/oauth2-client";
import { SENTRY_BASE_URL, SENTRY_SCOPES } from "./constants";

export const SENTRY_OAUTH_CLIENT = {
	id: "sentry",
	label: "Sentry API application",
} as const;

/**
 * Sentry OAuth (User Settings → API → Applications). The redirect URI must
 * match exactly; access tokens expire and are refreshed.
 */
export function createSentryOAuth(
	credentials: OAuthClientCredentials,
	redirectUri: string,
): OAuthProvider {
	return createOAuth2Provider({
		authorizationEndpoint: `${SENTRY_BASE_URL}/oauth/authorize/`,
		tokenEndpoint: `${SENTRY_BASE_URL}/oauth/token/`,
		credentials,
		redirectUri,
		scopes: SENTRY_SCOPES,
		pkce: false,
	});
}
