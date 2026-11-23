import type { OAuthClientCredentials } from "#/core/oauth";
import {
	getIntegrationBackend,
	integrationBackends,
} from "#/integrations/runtime-registry";
import {
	ConnectError,
	connectIntegration as runOAuthFlow,
} from "#/platform/oauth/oauth-flow";
import { getServices } from "#/platform/services";
import { syncStatus } from "#/platform/sync-status";

export interface IntegrationStatus {
	integrationId: string;
	/** The integration's OAuth client credentials are stored. */
	configured: boolean;
	connected: boolean;
	accountLabel: string | null;
	connectedAt: string | null;
	/** Redirect URI to register in the provider's OAuth app settings. */
	callbackUrl: string;
	oauthClient: {
		id: string;
		label: string;
		/** Stored client id (never the secret), or null. */
		clientId: string | null;
		/** Other integrations that use the same OAuth client. */
		sharedWith: string[];
	};
}

export async function fetchIntegrationStatuses(): Promise<IntegrationStatus[]> {
	const services = await getServices();
	const [connections, clients] = await Promise.all([
		services.connections.list(),
		services.oauthClients.list(),
	]);
	return integrationBackends.map((backend) => {
		const connection = connections.find((c) => c.integrationId === backend.id);
		const client = clients.find((c) => c.id === backend.oauthClient.id);
		return {
			integrationId: backend.id,
			configured: Boolean(client),
			connected: Boolean(connection),
			accountLabel: connection?.accountLabel ?? null,
			connectedAt: connection?.createdAt.toISOString() ?? null,
			callbackUrl: services.oauthCallbackUrl(backend.id),
			oauthClient: {
				...backend.oauthClient,
				clientId: client?.clientId ?? null,
				sharedWith: integrationBackends
					.filter(
						(other) =>
							other.id !== backend.id &&
							other.oauthClient.id === backend.oauthClient.id,
					)
					.map((other) => other.id),
			},
		};
	});
}

/**
 * Runs the full OAuth flow in the system browser and stores the tokens.
 * Rejects with a `ConnectError`.
 */
export async function connectIntegration(integrationId: string): Promise<void> {
	const integration = getIntegrationBackend(integrationId);
	if (!integration) {
		throw new ConnectError("unknown", `Unknown integration "${integrationId}"`);
	}
	const services = await getServices();
	const provider = await services.oauthProvider(integration);
	if (!provider) throw new ConnectError("not_configured");

	await runOAuthFlow({
		integration,
		provider,
		authorize: (url) => services.authorizeInBrowser(integrationId, url),
		connections: services.connections,
	});
	// Possibly another account: never show the previous one's cached data.
	await services.httpCache.clear(integrationId);
	syncStatus.reset(integrationId);
}

/** Stops waiting for the browser; the pending connect rejects with "cancelled". */
export async function cancelConnect(): Promise<void> {
	await (await getServices()).cancelAuthorization();
}

export async function disconnectIntegration(
	integrationId: string,
): Promise<void> {
	const services = await getServices();
	await services.connections.delete(integrationId);
	await services.httpCache.clear(integrationId);
	syncStatus.reset(integrationId);
}

export async function saveOAuthClient(
	oauthClientId: string,
	credentials: OAuthClientCredentials,
): Promise<void> {
	if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
		throw new Error("Client ID and client secret are required.");
	}
	await (await getServices()).oauthClients.save(oauthClientId, credentials);
}
