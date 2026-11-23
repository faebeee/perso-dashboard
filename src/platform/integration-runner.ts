import type {
	IntegrationBackend,
	IntegrationContext,
} from "#/core/integration";
import { err, ok, type Result, toIntegrationError } from "#/core/result";
import { getServices } from "./services";

/**
 * The one way fetchers talk to an integration: checks configuration,
 * resolves a valid token, runs the call and folds any failure into a Result.
 */
export async function withIntegration<T>(
	integration: IntegrationBackend,
	run: (ctx: IntegrationContext) => Promise<T>,
): Promise<Result<T>> {
	try {
		const services = await getServices();
		if (!(await services.oauthClients.get(integration.oauthClient.id))) {
			return err({
				kind: "not_configured",
				integrationId: integration.id,
				message: `Add your ${integration.oauthClient.label} on the Integrations page.`,
			});
		}
		const ctx = await services.tokenManager.getContext(integration);
		return ok(await run(ctx));
	} catch (cause) {
		const error = toIntegrationError(cause, integration.id);
		if (error.kind === "unknown") {
			console.error(`[${integration.id}]`, cause);
		}
		return err(error);
	}
}
