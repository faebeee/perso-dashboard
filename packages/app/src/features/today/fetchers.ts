import {
	type CalendarEvent,
	sortByStart,
} from "@dashboard/core/calendar-event";
import { unwrap } from "@dashboard/core/result";
import type { NewTodayItem, TodayItem } from "@dashboard/core/today";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { getServices } from "@dashboard/platform/services";
import { integrationBackends } from "#/integrations/runtime-registry";
import { type Collected, collectFromSources } from "#/lib/collect-sources";

const startOfToday = () => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
};

/** Open items (they carry over) plus what you finished today. */
export async function fetchToday(): Promise<TodayItem[]> {
	return (await getServices()).today.list(startOfToday());
}

/** Items you ticked off since `since` (daily review). */
export async function fetchCompletedSince(since: Date): Promise<TodayItem[]> {
	return (await getServices()).today.completedSince(since);
}

export async function addToToday(item: NewTodayItem): Promise<TodayItem> {
	if (!item.title.trim()) throw new Error("Write something first.");
	return (await getServices()).today.add(item);
}

export async function setTodayDone(id: string, done: boolean): Promise<void> {
	await (await getServices()).today.setDone(id, done);
}

export async function removeFromToday(id: string): Promise<void> {
	await (await getServices()).today.delete(id);
}

/** Today's events from every connected calendar, in start order. */
export async function fetchAgenda(
	day: Date,
): Promise<Collected<CalendarEvent>> {
	const from = new Date(day);
	from.setHours(0, 0, 0, 0);
	const to = new Date(from);
	to.setDate(to.getDate() + 1);

	const connected = new Set(
		(await (await getServices()).connections.list()).map(
			(c) => c.integrationId,
		),
	);
	const sources = integrationBackends.flatMap((backend) => {
		const getAgenda = backend.getAgenda;
		if (!getAgenda || !connected.has(backend.id)) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(
					await withIntegration(backend, (ctx) => getAgenda(ctx, { from, to })),
				),
		};
	});
	const { items, errors } = await collectFromSources(sources);
	return { items: sortByStart(items), errors };
}
