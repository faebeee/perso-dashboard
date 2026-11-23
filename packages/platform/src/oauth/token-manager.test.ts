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
