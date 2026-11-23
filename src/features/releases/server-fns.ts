import { createServerFn } from "@tanstack/react-start";
import {
	RECENT_RELEASE_DAYS,
	type Release,
	sortReleases,
} from "#/core/release";
import { unwrap } from "#/core/result";
import { integrationServers } from "#/integrations/registry.server";
import { type Collected, collectFromSources } from "#/lib/collect-sources";
import { withIntegration } from "#/server/integration-runner";
import { getServices } from "#/server/services";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Upcoming + recently shipped releases from every connected integration. */
export const fetchReleases = createServerFn({ method: "GET" }).handler(
	async (): Promise<Collected<Release>> => {
		const query = {
			releasedSince: new Date(Date.now() - RECENT_RELEASE_DAYS * DAY_MS),
		};
		const connected = new Set(
			(await getServices().connections.list()).map((c) => c.integrationId),
		);
		const sources = integrationServers.flatMap((server) => {
			const getReleases = server.getReleases;
			if (!getReleases || !connected.has(server.id)) return [];
			return {
				id: server.id,
				fetch: async () =>
					unwrap(
						await withIntegration(server, (ctx) => getReleases(ctx, query)),
					),
			};
		});
		const { items, errors } = await collectFromSources(sources);
		return { items: sortReleases(items), errors };
	},
);
