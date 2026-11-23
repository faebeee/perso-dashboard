import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { integrationServers } from "#/integrations/registry.server";
import { getServices } from "#/server/services";

export interface IntegrationStatus {
	integrationId: string;
	configured: boolean;
	connected: boolean;
	accountLabel: string | null;
	connectedAt: string | null;
	/** Redirect URI to register in the provider's OAuth app settings. */
	callbackUrl: string;
}

export const fetchIntegrationStatuses = createServerFn({
	method: "GET",
}).handler(async (): Promise<IntegrationStatus[]> => {
	const services = getServices();
	const connections = await services.connections.list();
	return integrationServers.map((server) => {
		const connection = connections.find((c) => c.integrationId === server.id);
		return {
			integrationId: server.id,
			configured: server.isConfigured(),
			connected: Boolean(connection),
			accountLabel: connection?.accountLabel ?? null,
			connectedAt: connection?.createdAt.toISOString() ?? null,
			callbackUrl: services.oauthCallbackUrl(server.id),
		};
	});
});

export const disconnectIntegration = createServerFn({ method: "POST" })
	.validator(z.object({ integrationId: z.string().min(1) }))
	.handler(async ({ data }) => {
		await getServices().connections.delete(data.integrationId);
	});
