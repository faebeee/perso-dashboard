import "@tanstack/react-start/server-only";
import type { IntegrationContext, IntegrationServer } from "#/core/integration";
import { err, ok, type Result, toIntegrationError } from "#/core/result";
import { getServices } from "./services";

/**
 * The one way server functions talk to an integration: checks configuration,
 * resolves a valid token, runs the call and folds any failure into a
 * serializable Result.
 */
export async function withIntegration<T>(
	integration: IntegrationServer,
	run: (ctx: IntegrationContext) => Promise<T>,
): Promise<Result<T>> {
	if (!integration.isConfigured()) {
		return err({
			kind: "not_configured",
			integrationId: integration.id,
			message: "OAuth client credentials are missing in .env.",
		});
	}
	try {
		const ctx = await getServices().tokenManager.getContext(integration);
		return ok(await run(ctx));
	} catch (cause) {
		const error = toIntegrationError(cause, integration.id);
		if (error.kind === "unknown") {
			console.error(`[${integration.id}]`, cause);
		}
		return err(error);
	}
}
