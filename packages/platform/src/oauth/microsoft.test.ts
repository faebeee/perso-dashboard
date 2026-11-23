import { describe, expect, it, vi } from "vitest";
import type { FetchFn } from "../host";
import { createMicrosoftOAuth } from "./microsoft";
import { createOAuth2Provider } from "./oauth2-client";

const REDIRECT = "http://localhost:47390/oauth/microsoft/callback";

describe("Microsoft OAuth", () => {
	it("asks for refresh tokens and the profile on top of the integration's scopes", async () => {
		const url = await createMicrosoftOAuth(
			{ clientId: "app-1", clientSecret: "" },
			REDIRECT,
			["Mail.Read", "User.Read"],
		).createAuthorizationUrl({ state: "st", codeVerifier: "v" });
		expect(url.origin + url.pathname).toBe(
			"https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
		);
		expect(url.searchParams.get("scope")).toBe(
			"offline_access User.Read Mail.Read",
		);
		expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT);
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
	});
});

describe("public clients", () => {
	it("never send a client secret when there is none", async () => {
		const fetch = vi.fn<FetchFn>(
			async () =>
				new Response(JSON.stringify({ access_token: "a", expires_in: 3600 })),
		);
		await createOAuth2Provider({
			authorizationEndpoint: "https://auth.example.com/authorize",
			tokenEndpoint: "https://auth.example.com/token",
			credentials: { clientId: "app-1", clientSecret: "" },
			redirectUri: REDIRECT,
			scopes: [],
			pkce: true,
			fetch,
		}).exchangeCode({ code: "c", codeVerifier: "v" });
		const form = new URLSearchParams(String(fetch.mock.calls[0]?.[1]?.body));
		expect(form.get("client_id")).toBe("app-1");
		expect(form.has("client_secret")).toBe(false);
		expect(form.get("code_verifier")).toBe("v");
	});
});
