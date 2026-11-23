import type {
	ActivityItem,
	MetricSeries,
	WeekRange,
} from "@dashboard/core/insights";
import type { IntegrationBackend } from "@dashboard/core/integration";
import { unwrap } from "@dashboard/core/result";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { getServices } from "@dashboard/platform/services";
import { integrationBackends } from "#/integrations/runtime-registry";
import { type Collected, collectFromSources } from "#/lib/collect-sources";

async function connectedBackends(): Promise<IntegrationBackend[]> {
	const connected = new Set(
		(await (await getServices()).connections.list()).map(
			(c) => c.integrationId,
		),
	);
	return integrationBackends.filter((b) => connected.has(b.id));
}

/** What you did in [from, to), from every source that reports activity. */
export async function fetchActivity(
	from: Date,
	to: Date,
): Promise<Collected<ActivityItem>> {
	const sources = (await connectedBackends()).flatMap((backend) => {
		const getActivity = backend.getActivity;
		if (!getActivity) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(
					await withIntegration(backend, (ctx) =>
						getActivity(ctx, { from, to }),
					),
				),
		};
	});
	const { items, errors } = await collectFromSources(sources);
	return {
		items: items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
		errors,
	};
}

/** Weekly series from every source that reports metrics. */
export async function fetchMetrics(
	weeks: WeekRange[],
	now: Date,
): Promise<Collected<MetricSeries>> {
	const sources = (await connectedBackends()).flatMap((backend) => {
		const getMetrics = backend.getMetrics;
		if (!getMetrics) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(
					await withIntegration(backend, (ctx) => getMetrics(ctx, weeks, now)),
				),
		};
	});
	return collectFromSources(sources);
}
