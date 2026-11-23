import type { IntegrationBackend } from "@dashboard/core/integration";
import type { OAuthProvider, OAuthTokenSet } from "@dashboard/core/oauth";
import { describe, expect, it, vi } from "vitest";
import { BrowserAuthError } from "../host";
import type { ConnectionRepository } from "../repositories/connection-repository";
import { type BrowserAuthorizer, connectIntegration } from "./oauth-flow";

const tokens: OAuthTokenSet = {
	accessToken: "at",
	refreshToken: null,
	expiresAt: null,
	scopes: [],
};

function setup(respond: (authorizationUrl: URL) => string) {
	const provider: OAuthProvider = {
		createAuthorizationUrl: vi.fn(async ({ state }) => {
			const url = new URL("https://auth.example.com/authorize");
			url.searchParams.set("state", state);
			return url;
		}),
		exchangeCode: vi.fn(async () => tokens),
	};
	const integration = {
		id: "test",
		describeAccount: vi.fn(async () => ({ label: "me", meta: { x: 1 } })),
	} as unknown as IntegrationBackend;
	const connections = { save: vi.fn() } as unknown as ConnectionRepository;
	const authorize: BrowserAuthorizer = async (url) => new URL(respond(url));
	const run = () =>
		connectIntegration({ integration, provider, authorize, connections });
	return { run, provider, connections };
}

const callback = "http://127.0.0.1:47390/oauth/test/callback";
const stateOf = (url: URL) => url.searchParams.get("state");

describe("connectIntegration", () => {
	it("exchanges the code with the matching verifier and saves the account", async () => {
		const { run, provider, connections } = setup(
			(url) => `${callback}?code=abc&state=${stateOf(url)}`,
		);
		await expect(run()).resolves.toEqual({ label: "me", meta: { x: 1 } });

		const { codeVerifier } = vi.mocked(provider.createAuthorizationUrl).mock
			.calls[0]?.[0] ?? { codeVerifier: "" };
		expect(provider.exchangeCode).toHaveBeenCalledWith({
			code: "abc",
			codeVerifier,
		});
		expect(connections.save).toHaveBeenCalledWith({
			integrationId: "test",
			tokens,
			accountLabel: "me",
			meta: { x: 1 },
		});
	});

	it("rejects a mismatched state without exchanging the code", async () => {
		const { run, provider } = setup(() => `${callback}?code=abc&state=forged`);
		await expect(run()).rejects.toMatchObject({ code: "invalid_state" });
		expect(provider.exchangeCode).not.toHaveBeenCalled();
	});

	it("maps a denied consent screen", async () => {
		const { run } = setup(
			(url) => `${callback}?error=access_denied&state=${stateOf(url)}`,
		);
		await expect(run()).rejects.toMatchObject({ code: "access_denied" });
	});

	it("maps browser-side failures (cancel, timeout…)", async () => {
		const { run } = setup(() => {
			throw new BrowserAuthError("cancelled", "cancelled");
		});
		await expect(run()).rejects.toMatchObject({ code: "cancelled" });
	});

	it("reports exchange failures", async () => {
		const { run, provider } = setup(
			(url) => `${callback}?code=abc&state=${stateOf(url)}`,
		);
		vi.mocked(provider.exchangeCode).mockRejectedValue(new Error("boom"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(run()).rejects.toMatchObject({ code: "exchange_failed" });
	});
});
