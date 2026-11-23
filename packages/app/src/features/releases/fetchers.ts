import {
	type Release,
	recentReleaseQuery,
	sortReleases,
} from "@dashboard/core/release";
import { unwrap } from "@dashboard/core/result";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { getServices } from "@dashboard/platform/services";
import { integrationBackends } from "#/integrations/runtime-registry";
import { type Collected, collectFromSources } from "#/lib/collect-sources";

/** Upcoming + recently shipped releases from every connected integration. */
export async function fetchReleases(): Promise<Collected<Release>> {
	const query = recentReleaseQuery();
	const connected = new Set(
		(await (await getServices()).connections.list()).map(
			(c) => c.integrationId,
		),
	);
	const sources = integrationBackends.flatMap((backend) => {
		const getReleases = backend.getReleases;
		if (!getReleases || !connected.has(backend.id)) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(
					await withIntegration(backend, (ctx) => getReleases(ctx, query)),
				),
		};
	});
	const { items, errors } = await collectFromSources(sources);
	return { items: sortReleases(items), errors };
}
