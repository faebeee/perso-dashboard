import { unwrap } from "#/core/result";
import { integrationBackends } from "#/integrations/runtime-registry";
import { withIntegration } from "#/platform/integration-runner";
import { getServices } from "#/platform/services";
import { aggregateFeed, type FeedResult } from "./aggregate";

/** Unified "My Work" feed across every connected integration. */
export async function fetchFeed(): Promise<FeedResult> {
	const connected = new Set(
		(await (await getServices()).connections.list()).map(
			(c) => c.integrationId,
		),
	);
	const sources = integrationBackends.flatMap((backend) => {
		const getFeedItems = backend.getFeedItems;
		if (!getFeedItems || !connected.has(backend.id)) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(await withIntegration(backend, (ctx) => getFeedItems(ctx))),
		};
	});
	return aggregateFeed(sources);
}
