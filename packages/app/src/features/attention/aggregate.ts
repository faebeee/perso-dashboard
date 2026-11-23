import { type AttentionItem, rankAttention } from "@dashboard/core/attention";
import {
	type Collected,
	collectFromSources,
	type Source,
} from "#/lib/collect-sources";

export type AttentionResult = Collected<AttentionItem>;

/** Fetches all sources in parallel, tolerates partial failure, ranks by urgency. */
export async function aggregateAttention(
	sources: readonly Source<AttentionItem>[],
): Promise<AttentionResult> {
	const { items, errors } = await collectFromSources(sources);
	return { items: rankAttention(items), errors };
}
