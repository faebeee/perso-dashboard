/**
 * Provider-agnostic OAuth contract. Concrete providers (arctic, hand-rolled,
 * anything else) are adapted to this shape inside each integration, so the
 * OAuth engine and token manager never depend on a specific library.
 */

export interface OAuthTokenSet {
	accessToken: string;
	refreshToken: string | null;
	/** null = token does not expire (e.g. GitHub OAuth App tokens). */
	expiresAt: Date | null;
	scopes: string[];
}

export interface OAuthProvider {
	createAuthorizationUrl(input: { state: string; codeVerifier: string }): URL;
	exchangeCode(input: {
		code: string;
		codeVerifier: string;
	}): Promise<OAuthTokenSet>;
	/** Omit when the provider issues non-expiring tokens. */
	refresh?(refreshToken: string): Promise<OAuthTokenSet>;
}
