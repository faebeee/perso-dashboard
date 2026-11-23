import { createServerFn } from "@tanstack/react-start";
import { unwrap } from "#/core/result";
import { integrationServers } from "#/integrations/registry.server";
import { withIntegration } from "#/server/integration-runner";
import { getServices } from "#/server/services";
import { aggregateFeed, type FeedResult } from "./aggregate";

/** Unified "My Work" feed across every connected integration. */
export const fetchFeed = createServerFn({ method: "GET" }).handler(
	async (): Promise<FeedResult> => {
		const connected = new Set(
			(await getServices().connections.list()).map((c) => c.integrationId),
		);
		const sources = integrationServers.flatMap((server) => {
			const getFeedItems = server.getFeedItems;
			if (!getFeedItems || !connected.has(server.id)) return [];
			return {
				id: server.id,
				fetch: async () =>
					unwrap(await withIntegration(server, (ctx) => getFeedItems(ctx))),
			};
		});
		return aggregateFeed(sources);
	},
);
