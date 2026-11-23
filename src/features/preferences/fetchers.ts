import type { SettingOption } from "#/core/integration";
import type { Result } from "#/core/result";
import { getIntegrationBackend } from "#/integrations/runtime-registry";
import { withIntegration } from "#/platform/integration-runner";

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
