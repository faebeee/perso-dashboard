import { z } from "zod";
import type {
	OAuthClientCredentials,
	OAuthProvider,
	OAuthTokenSet,
} from "#/core/oauth";
import { pkceChallenge } from "../encoding";
import { type FetchFn, hostFetch } from "../host";

/**
 * Generic OAuth 2.0 authorization-code client (RFC 6749) with optional PKCE
 * (RFC 7636). Each integration's `oauth.ts` configures one of these. It's
 * hand-rolled rather than a library because token requests must go through
 * the host's fetch (webview fetch is blocked by CORS on token endpoints).
 */
export interface OAuth2Config {
	authorizationEndpoint: string;
	tokenEndpoint: string;
	credentials: OAuthClientCredentials;
	redirectUri: string;
	scopes: string[];
	/** Send an S256 code challenge. Only enable for providers that support it. */
	pkce: boolean;
	/** Extra authorization URL parameters (access_type, audience, prompt…). */
	authorizationParams?: Record<string, string>;
	/** Defaults to the host's fetch. Injectable for tests. */
	fetch?: FetchFn;
	now?: () => number;
}

export class OAuthError extends Error {
	readonly code: string;

	constructor(code: string, description?: string) {
		super(description ? `${code}: ${description}` : code);
		this.name = "OAuthError";
		this.code = code;
	}
}

const tokenResponseSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().optional(),
	expires_in: z.coerce.number().optional(),
	scope: z.string().optional(),
});

const errorResponseSchema = z.object({
	error: z.string(),
	error_description: z.string().optional(),
});

export function createOAuth2Provider(config: OAuth2Config): OAuthProvider {
	const fetchFn = config.fetch ?? hostFetch;
	const now = config.now ?? Date.now;
	const { clientId, clientSecret } = config.credentials;

	async function requestTokens(
		params: Record<string, string>,
	): Promise<OAuthTokenSet> {
		const response = await fetchFn(config.tokenEndpoint, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				...params,
				client_id: clientId,
				// Public clients (no secret) must not send one at all.
				...(clientSecret ? { client_secret: clientSecret } : {}),
			}).toString(),
		});

		const body: unknown = await response.json().catch(() => null);
		// GitHub reports errors with HTTP 200 and an `error` field.
		const failure = errorResponseSchema.safeParse(body);
		if (failure.success) {
			throw new OAuthError(failure.data.error, failure.data.error_description);
		}
		if (!response.ok) {
			throw new OAuthError("token_request_failed", `HTTP ${response.status}`);
		}
		const parsed = tokenResponseSchema.safeParse(body);
		if (!parsed.success) {
			throw new OAuthError("invalid_token_response");
		}

		const tokens = parsed.data;
		return {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token ?? null,
			expiresAt:
				tokens.expires_in !== undefined
					? new Date(now() + tokens.expires_in * 1000)
					: null,
			// GitHub separates scopes with commas, everyone else with spaces.
			scopes: tokens.scope
				? tokens.scope.split(/[\s,]+/).filter(Boolean)
				: config.scopes,
		};
	}

	return {
		async createAuthorizationUrl({ state, codeVerifier }) {
			const url = new URL(config.authorizationEndpoint);
			const params = url.searchParams;
			params.set("response_type", "code");
			params.set("client_id", clientId);
			params.set("redirect_uri", config.redirectUri);
			params.set("state", state);
			if (config.scopes.length > 0) {
				params.set("scope", config.scopes.join(" "));
			}
			if (config.pkce) {
				params.set("code_challenge", await pkceChallenge(codeVerifier));
				params.set("code_challenge_method", "S256");
			}
			for (const [key, value] of Object.entries(
				config.authorizationParams ?? {},
			)) {
				params.set(key, value);
			}
			return url;
		},

		exchangeCode: ({ code, codeVerifier }) =>
			requestTokens({
				grant_type: "authorization_code",
				code,
				redirect_uri: config.redirectUri,
				...(config.pkce ? { code_verifier: codeVerifier } : {}),
			}),

		refresh: (refreshToken) =>
			requestTokens({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}),
	};
}
