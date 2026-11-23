import { unwrap } from "#/core/result";
import { integrationBackends } from "#/integrations/runtime-registry";
import { withIntegration } from "#/platform/integration-runner";
import { getServices } from "#/platform/services";
import { type AttentionResult, aggregateAttention } from "./aggregate";

/** Everything that needs attention soon, from every connected integration. */
export async function fetchAttention(): Promise<AttentionResult> {
	const now = new Date();
	const connected = new Set(
		(await (await getServices()).connections.list()).map(
			(c) => c.integrationId,
		),
	);
	const sources = integrationBackends.flatMap((backend) => {
		const getAttentionItems = backend.getAttentionItems;
		if (!getAttentionItems || !connected.has(backend.id)) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(
					await withIntegration(backend, (ctx) => getAttentionItems(ctx, now)),
				),
		};
	});
	return aggregateAttention(sources);
}
