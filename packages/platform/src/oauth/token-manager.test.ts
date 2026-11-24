import type { IntegrationBackend } from "@dashboard/core/integration";
import type { OAuthProvider, OAuthTokenSet } from "@dashboard/core/oauth";
import { IntegrationFailure } from "@dashboard/core/result";
import { describe, expect, it, vi } from "vitest";
import type {
	Connection,
	ConnectionRepository,
} from "../repositories/connection-repository";
import { createTokenManager } from "./token-manager";

const NOW = Date.parse("2026-01-01T12:00:00Z");

function connection(overrides: Partial<Connection> = {}): Connection {
	return {
		integrationId: "test",
		accessToken: "old-access",
		refreshToken: "old-refresh",
		expiresAt: new Date(NOW + 3600_000),
		scopes: [],
		accountLabel: "me",
		meta: { site: "x" },
		createdAt: new Date(NOW),
		updatedAt: new Date(NOW),
		...overrides,
	};
}

function setup(
	stored: Connection | null,
	provider: Partial<OAuthProvider> = {},
) {
	const repo: ConnectionRepository = {
		get: vi.fn(async () => stored),
		list: vi.fn(),
		save: vi.fn(),
		updateTokens: vi.fn(async () => {}),
		delete: vi.fn(),
	};
	const fullProvider: OAuthProvider = {
		createAuthorizationUrl: vi.fn(),
		exchangeCode: vi.fn(),
		...provider,
	};
	const integration = { id: "test" } as IntegrationBackend;
	const manager = createTokenManager({
		connections: repo,
		resolveProvider: async () => fullProvider,
		now: () => NOW,
	});
	return { repo, manager, integration };
}

const refreshed: OAuthTokenSet = {
	accessToken: "new-access",
	refreshToken: "new-refresh",
	expiresAt: new Date(NOW + 3600_000),
	scopes: [],
};

describe("createTokenManager", () => {
	it("returns the stored token when it is still valid", async () => {
		const refresh = vi.fn();
		const { manager, integration } = setup(connection(), { refresh });
		await expect(manager.getContext(integration)).resolves.toEqual({
			scopes: [],
			accessToken: "old-access",
			meta: { site: "x" },
		});
		expect(refresh).not.toHaveBeenCalled();
	});

	it("never refreshes tokens without expiry", async () => {
		const refresh = vi.fn();
		const { manager, integration } = setup(connection({ expiresAt: null }), {
			refresh,
		});
		await manager.getContext(integration);
		expect(refresh).not.toHaveBeenCalled();
	});

	it("refreshes and persists when the token is about to expire", async () => {
		const refresh = vi.fn(async () => refreshed);
		const { manager, integration, repo } = setup(
			connection({ expiresAt: new Date(NOW + 30_000) }),
			{ refresh },
		);
		const ctx = await manager.getContext(integration);
		expect(ctx.accessToken).toBe("new-access");
		expect(refresh).toHaveBeenCalledWith("old-refresh");
		expect(repo.updateTokens).toHaveBeenCalledWith("test", refreshed);
	});

	it("deduplicates concurrent refreshes", async () => {
		const refresh = vi.fn(async () => refreshed);
		const { manager, integration } = setup(
			connection({ expiresAt: new Date(NOW - 1) }),
			{ refresh },
		);
		await Promise.all([
			manager.getContext(integration),
			manager.getContext(integration),
			manager.getContext(integration),
		]);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it("fails with not_connected when there is no connection", async () => {
		const { manager, integration } = setup(null);
		await expect(manager.getContext(integration)).rejects.toMatchObject({
			error: { kind: "not_connected" },
		});
	});

	it("fails with unauthorized when refresh is impossible", async () => {
		const { manager, integration } = setup(
			connection({ expiresAt: new Date(NOW - 1), refreshToken: null }),
			{ refresh: vi.fn() },
		);
		await expect(manager.getContext(integration)).rejects.toBeInstanceOf(
			IntegrationFailure,
		);
	});

	it("maps a failing refresh to unauthorized", async () => {
		const { manager, integration } = setup(
			connection({ expiresAt: new Date(NOW - 1) }),
			{
				refresh: vi.fn(async () => {
					throw new Error("invalid_grant");
				}),
			},
		);
		await expect(manager.getContext(integration)).rejects.toMatchObject({
			error: { kind: "unauthorized" },
		});
	});
});

describe("token manager failure paths", () => {
	const expired = () => connection({ expiresAt: new Date(NOW - 1000) });

	it("reports missing OAuth client credentials when a refresh is needed", async () => {
		const repo = {
			get: vi.fn(async () => expired()),
		} as unknown as ConnectionRepository;
		const manager = createTokenManager({
			connections: repo,
			resolveProvider: async () => null,
			now: () => NOW,
		});
		await expect(
			manager.getContext({ id: "test" } as IntegrationBackend),
		).rejects.toMatchObject({ error: { kind: "not_configured" } });
	});

	it("asks to reconnect when the provider can't refresh", async () => {
		const { manager, integration } = setup(expired());
		await expect(manager.getContext(integration)).rejects.toMatchObject({
			error: { kind: "unauthorized" },
		});
	});

	it("refreshes at the skew boundary", async () => {
		const refresh = vi.fn(
			async (): Promise<OAuthTokenSet> => ({
				accessToken: "new",
				refreshToken: null,
				expiresAt: null,
				scopes: [],
			}),
		);
		const { manager, integration } = setup(
			connection({ expiresAt: new Date(NOW + 60_000) }),
			{ refresh },
		);
		expect((await manager.getContext(integration)).accessToken).toBe("new");
	});

	it("tries again after a failed refresh instead of caching the failure", async () => {
		const refresh = vi
			.fn<() => Promise<OAuthTokenSet>>()
			.mockRejectedValueOnce(new Error("invalid_grant"))
			.mockResolvedValueOnce({
				accessToken: "new",
				refreshToken: null,
				expiresAt: null,
				scopes: [],
			});
		const { manager, integration } = setup(expired(), { refresh });
		await expect(manager.getContext(integration)).rejects.toMatchObject({
			error: { kind: "unauthorized" },
		});
		expect((await manager.getContext(integration)).accessToken).toBe("new");
		expect(refresh).toHaveBeenCalledTimes(2);
	});

	it("passes typed failures (offline) through unchanged", async () => {
		const offline = new IntegrationFailure({
			kind: "network",
			message: "offline",
		});
		const { manager, integration } = setup(expired(), {
			refresh: vi.fn(async () => {
				throw offline;
			}),
		});
		await expect(manager.getContext(integration)).rejects.toBe(offline);
	});
});
