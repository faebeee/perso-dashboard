import "@tanstack/react-start/server-only";
import { getIntegrationServer } from "#/integrations/registry.server";
import {
	beginAuthorization,
	completeAuthorization,
} from "#/server/oauth/oauth-flow";
import { getServices } from "#/server/services";

/** HTTP handlers behind /api/oauth/:provider/{start,callback}. */

export function handleOAuthStart(integrationId: string): Response {
	const integration = getIntegrationServer(integrationId);
	if (!integration?.isConfigured()) {
		return new Response(`Integration "${integrationId}" is not available`, {
			status: 404,
		});
	}
	const services = getServices();
	return beginAuthorization({
		integrationId,
		provider: services.oauthProvider(integration),
		secureCookies: services.appUrl.startsWith("https://"),
	});
}

export function handleOAuthCallback(
	integrationId: string,
	request: Request,
): Promise<Response> | Response {
	const integration = getIntegrationServer(integrationId);
	if (!integration?.isConfigured()) {
		return new Response(`Integration "${integrationId}" is not available`, {
			status: 404,
		});
	}
	const services = getServices();
	return completeAuthorization({
		request,
		integration,
		provider: services.oauthProvider(integration),
		connections: services.connections,
		appUrl: services.appUrl,
		secureCookies: services.appUrl.startsWith("https://"),
	});
}
