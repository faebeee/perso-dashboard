import { describe, expect, it, vi } from "vitest";
import { pkceChallenge } from "../encoding";
import type { FetchFn } from "../host";
import {
	createOAuth2Provider,
	type OAuth2Config,
	OAuthError,
} from "./oauth2-client";

const NOW = Date.parse("2026-01-01T12:00:00Z");

function provider(fetch: FetchFn, overrides: Partial<OAuth2Config> = {}) {
	return createOAuth2Provider({
		authorizationEndpoint: "https://auth.example.com/authorize",
		tokenEndpoint: "https://auth.example.com/token",
		credentials: { clientId: "client-1", clientSecret: "secret-1" },
		redirectUri: "http://127.0.0.1:47390/oauth/test/callback",
		scopes: ["read", "write"],
		pkce: true,
		fetch,
		now: () => NOW,
		...overrides,
	});
}

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status });

const sentForm = (fetch: ReturnType<typeof vi.fn<FetchFn>>) =>
	new URLSearchParams(String(fetch.mock.calls[0]?.[1]?.body));

describe("createOAuth2Provider", () => {
	it("builds an authorization URL with PKCE and extra params", async () => {
		const url = await provider(vi.fn(), {
			authorizationParams: { prompt: "consent" },
		}).createAuthorizationUrl({ state: "st", codeVerifier: "verifier" });

		expect(url.origin + url.pathname).toBe(
			"https://auth.example.com/authorize",
		);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			response_type: "code",
			client_id: "client-1",
			redirect_uri: "http://127.0.0.1:47390/oauth/test/callback",
			state: "st",
			scope: "read write",
			code_challenge: await pkceChallenge("verifier"),
			code_challenge_method: "S256",
			prompt: "consent",
		});
	});

	it("omits PKCE when disabled", async () => {
		const url = await provider(vi.fn(), { pkce: false }).createAuthorizationUrl(
			{ state: "st", codeVerifier: "verifier" },
		);
		expect(url.searchParams.has("code_challenge")).toBe(false);
	});

	it("exchanges a code and maps the token response", async () => {
		const fetch = vi.fn<FetchFn>(async () =>
			json({
				access_token: "at",
				refresh_token: "rt",
				expires_in: 3600,
				scope: "read,write",
			}),
		);
		await expect(
			provider(fetch).exchangeCode({ code: "c", codeVerifier: "v" }),
		).resolves.toEqual({
			accessToken: "at",
			refreshToken: "rt",
			expiresAt: new Date(NOW + 3600_000),
			scopes: ["read", "write"],
		});
		expect(Object.fromEntries(sentForm(fetch))).toEqual({
			grant_type: "authorization_code",
			code: "c",
			redirect_uri: "http://127.0.0.1:47390/oauth/test/callback",
			code_verifier: "v",
			client_id: "client-1",
			client_secret: "secret-1",
		});
	});

	it("treats a missing expires_in as a non-expiring token", async () => {
		const fetch = vi.fn<FetchFn>(async () => json({ access_token: "at" }));
		await expect(
			provider(fetch).exchangeCode({ code: "c", codeVerifier: "v" }),
		).resolves.toMatchObject({
			refreshToken: null,
			expiresAt: null,
			scopes: ["read", "write"],
		});
	});

	it("refreshes with the refresh_token grant", async () => {
		const fetch = vi.fn<FetchFn>(async () => json({ access_token: "at2" }));
		await provider(fetch).refresh?.("rt");
		expect(sentForm(fetch).get("grant_type")).toBe("refresh_token");
		expect(sentForm(fetch).get("refresh_token")).toBe("rt");
	});

	it("throws OAuthError for error bodies, even with HTTP 200 (GitHub)", async () => {
		const fetch = vi.fn<FetchFn>(async () =>
			json({ error: "bad_verification_code", error_description: "expired" }),
		);
		const exchange = provider(fetch).exchangeCode({
			code: "c",
			codeVerifier: "v",
		});
		await expect(exchange).rejects.toBeInstanceOf(OAuthError);
		await expect(exchange).rejects.toMatchObject({
			code: "bad_verification_code",
		});
	});

	it("throws on non-JSON error responses", async () => {
		const fetch = vi.fn<FetchFn>(
			async () => new Response("bad gateway", { status: 502 }),
		);
		await expect(
			provider(fetch).exchangeCode({ code: "c", codeVerifier: "v" }),
		).rejects.toMatchObject({ code: "token_request_failed" });
	});
});
