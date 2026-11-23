import "@tanstack/react-start/server-only";
import type { IntegrationContext, IntegrationServer } from "#/core/integration";
import type { OAuthProvider } from "#/core/oauth";
import { IntegrationFailure } from "#/core/result";
import type { ConnectionRepository } from "../repositories/connection-repository";

export interface TokenManagerDeps {
	connections: ConnectionRepository;
	resolveProvider: (integration: IntegrationServer) => OAuthProvider;
	now?: () => number;
	/** Refresh this long before actual expiry. */
	refreshSkewMs?: number;
}

export interface TokenManager {
	/** Returns a context with a valid access token, refreshing when needed. */
	getContext(integration: IntegrationServer): Promise<IntegrationContext>;
}

export function createTokenManager({
	connections,
	resolveProvider,
	now = Date.now,
	refreshSkewMs = 60_000,
}: TokenManagerDeps): TokenManager {
	// Parallel widget requests share a single refresh per integration.
	const inflight = new Map<string, Promise<IntegrationContext>>();

	async function load(
		integration: IntegrationServer,
	): Promise<IntegrationContext> {
		const id = integration.id;
		const connection = await connections.get(id);
		if (!connection) {
			throw new IntegrationFailure({
				kind: "not_connected",
				integrationId: id,
				message: "Account not connected.",
			});
		}

		const expiresAt = connection.expiresAt?.getTime();
		const needsRefresh =
			expiresAt !== undefined && expiresAt - refreshSkewMs <= now();
		if (!needsRefresh) {
			return { accessToken: connection.accessToken, meta: connection.meta };
		}

		const provider = resolveProvider(integration);
		if (!connection.refreshToken || !provider.refresh) {
			throw unauthorized(id, "Session expired. Reconnect the account.");
		}

		try {
			const tokens = await provider.refresh(connection.refreshToken);
			await connections.updateTokens(id, tokens);
			return { accessToken: tokens.accessToken, meta: connection.meta };
		} catch (cause) {
			if (cause instanceof IntegrationFailure) throw cause;
			throw unauthorized(
				id,
				`Could not refresh access: ${(cause as Error).message}`,
			);
		}
	}

	return {
		getContext(integration) {
			const pending = inflight.get(integration.id);
			if (pending) return pending;
			const promise = load(integration).finally(() =>
				inflight.delete(integration.id),
			);
			inflight.set(integration.id, promise);
			return promise;
		},
	};
}

function unauthorized(integrationId: string, message: string) {
	return new IntegrationFailure({
		kind: "unauthorized",
		integrationId,
		message,
	});
}
