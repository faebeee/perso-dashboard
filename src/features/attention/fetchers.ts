import type { AttentionItem } from "#/core/attention";
import { attentionFingerprint, type Dismissal } from "#/core/dismissal";
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

export async function fetchDismissals(): Promise<Dismissal[]> {
	return (await getServices()).dismissals.list(new Date());
}

/** Clears an urgent item until it escalates ("done") or until a time. */
export async function dismissItem(
	item: AttentionItem,
	until: Date | null,
): Promise<void> {
	await (await getServices()).dismissals.save({
		itemId: item.id,
		mode: until ? "snoozed" : "done",
		until,
		fingerprint: attentionFingerprint(item),
	});
}

export async function restoreItem(itemId: string): Promise<void> {
	await (await getServices()).dismissals.delete(itemId);
}
