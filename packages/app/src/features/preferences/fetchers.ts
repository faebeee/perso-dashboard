import type { SettingOption } from "@dashboard/core/integration";
import type { Result } from "@dashboard/core/result";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { getIntegrationBackend } from "#/integrations/runtime-registry";

/** Options of a `choice-list` setting, read from the connected account. */
export async function fetchSettingOptions(
	integrationId: string,
	key: string,
): Promise<Result<SettingOption[]>> {
	const backend = getIntegrationBackend(integrationId);
	const load = backend?.loadSettingOptions;
	if (!backend || !load) return { ok: true, value: [] };
	return withIntegration(backend, (ctx) => load(ctx, key));
}
