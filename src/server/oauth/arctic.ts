import "@tanstack/react-start/server-only";
import type { OAuth2Tokens } from "arctic";
import type { OAuthTokenSet } from "#/core/oauth";

/**
 * Adapter: arctic's token object → our library-agnostic OAuthTokenSet.
 * This is the only place outside integration `oauth.ts` files that knows
 * about arctic, so swapping the OAuth library stays a local change.
 */
export function fromArcticTokens(
	tokens: OAuth2Tokens,
	fallbackScopes: string[] = [],
): OAuthTokenSet {
	const data = tokens.data as Record<string, unknown>;
	return {
		accessToken: tokens.accessToken(),
		refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
		expiresAt:
			typeof data.expires_in === "number"
				? tokens.accessTokenExpiresAt()
				: null,
		scopes: tokens.hasScopes() ? splitScopes(tokens) : fallbackScopes,
	};
}

function splitScopes(tokens: OAuth2Tokens): string[] {
	// GitHub separates scopes with commas, everyone else with spaces.
	const raw = (tokens.data as { scope?: unknown }).scope;
	if (typeof raw === "string") return raw.split(/[\s,]+/).filter(Boolean);
	return tokens.scopes();
}
