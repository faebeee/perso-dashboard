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
	return { run, provider, connections, integration };
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

	it("rejects a redirect without state, even with a code", async () => {
		const { run, provider } = setup(() => `${callback}?code=abc`);
		await expect(run()).rejects.toMatchObject({ code: "invalid_state" });
		expect(provider.exchangeCode).not.toHaveBeenCalled();
	});

	it("checks the state before trusting a provider error", async () => {
		const { run } = setup(
			() =>
				`${callback}?error=access_denied&error_description=evil&state=forged`,
		);
		await expect(run()).rejects.toMatchObject({ code: "invalid_state" });
	});

	it("passes other provider errors on with their description", async () => {
		const { run } = setup(
			(url) =>
				`${callback}?error=server_error&error_description=Try+later&state=${stateOf(url)}`,
		);
		await expect(run()).rejects.toMatchObject({
			code: "unknown",
			message: "Try later",
		});
	});

	it("rejects a matching state without a code", async () => {
		const { run } = setup((url) => `${callback}?state=${stateOf(url)}`);
		await expect(run()).rejects.toMatchObject({ code: "invalid_state" });
	});

	it("maps a listener I/O failure to unknown", async () => {
		const { run } = setup(() => {
			throw new BrowserAuthError("io", "port busy");
		});
		await expect(run()).rejects.toMatchObject({ code: "unknown" });
	});

	it("saves nothing when the account can't be read", async () => {
		const { run, connections, integration } = setup(
			(url) => `${callback}?code=abc&state=${stateOf(url)}`,
		);
		vi.mocked(integration.describeAccount).mockRejectedValue(new Error("401"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(run()).rejects.toMatchObject({ code: "exchange_failed" });
		expect(connections.save).not.toHaveBeenCalled();
	});

	it("uses a fresh, unguessable state and verifier per attempt", async () => {
		const states: string[] = [];
		const verifiers: string[] = [];
		const { run, provider } = setup(
			(url) => `${callback}?code=abc&state=${stateOf(url)}`,
		);
		await run();
		await run();
		for (const call of vi.mocked(provider.createAuthorizationUrl).mock.calls) {
			states.push(call[0].state);
			verifiers.push(call[0].codeVerifier);
		}
		expect(new Set(states).size).toBe(2);
		expect(new Set(verifiers).size).toBe(2);
		expect(states[0]).not.toBe(verifiers[0]);
		for (const value of [...states, ...verifiers])
			expect(value.length).toBeGreaterThanOrEqual(32);
	});
});
