/**
 * Provider-agnostic OAuth contract. Concrete providers are adapted to this
 * shape inside each integration, so the OAuth flow and token manager never
 * depend on a specific provider or library.
 */

export interface OAuthTokenSet {
	accessToken: string;
	refreshToken: string | null;
	/** null = token does not expire (e.g. GitHub OAuth App tokens). */
	expiresAt: Date | null;
	scopes: string[];
}

/** The OAuth app the user registered with the provider. */
export interface OAuthClientCredentials {
	clientId: string;
	/**
	 * Desktop apps are "public" clients, but GitHub, Atlassian and Google still
	 * require the secret at the token endpoint. It stays on this machine.
	 */
	clientSecret: string;
}

/**
 * A provider's OAuth app, shared by every integration that names it
 * (Gmail and Google Calendar both use "google").
 */
export interface OAuthClientRef {
	/** Storage key, e.g. "google". */
	id: string;
	/** Shown in the credentials form, e.g. "Google OAuth client". */
	label: string;
}

export interface OAuthProvider {
	createAuthorizationUrl(input: {
		state: string;
		codeVerifier: string;
	}): Promise<URL>;
	exchangeCode(input: {
		code: string;
		codeVerifier: string;
	}): Promise<OAuthTokenSet>;
	/** Omit when the provider issues non-expiring tokens. */
	refresh?(refreshToken: string): Promise<OAuthTokenSet>;
}
