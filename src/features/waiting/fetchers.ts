import { type CalendarEvent, sortByStart } from "#/core/calendar-event";
import type { IntegrationBackend } from "#/core/integration";
import { unwrap } from "#/core/result";
import type { WaitingItem } from "#/core/waiting";
import { WAITING_RULES } from "#/core/waiting";
import type { WorkItem } from "#/core/work-item";
import { integrationBackends } from "#/integrations/runtime-registry";
import { type Collected, collectFromSources } from "#/lib/collect-sources";
import { withIntegration } from "#/platform/integration-runner";
import { getServices } from "#/platform/services";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Meeting prep looks this far ahead, for at most this many meetings. */
const PREP_WINDOW_MS = DAY_MS;
const PREP_MEETING_LIMIT = 3;
/** People per meeting used for the related search. */
const PREP_PEOPLE_LIMIT = 10;

async function connectedBackends(): Promise<IntegrationBackend[]> {
	const connected = new Set(
		(await (await getServices()).connections.list()).map(
			(c) => c.integrationId,
		),
	);
	return integrationBackends.filter((b) => connected.has(b.id));
}

/** Everything you're waiting on others for, oldest first within each source. */
export async function fetchWaiting(): Promise<Collected<WaitingItem>> {
	const now = new Date();
	const sources = (await connectedBackends()).flatMap((backend) => {
		const getWaitingItems = backend.getWaitingItems;
		if (!getWaitingItems) return [];
		return {
			id: backend.id,
			fetch: async () =>
				unwrap(
					await withIntegration(backend, (ctx) => getWaitingItems(ctx, now)),
				),
		};
	});
	return collectFromSources(sources);
}

export interface MeetingPrep {
	meeting: CalendarEvent;
	/** Recent items with the attendees (e.g. email conversations). */
	related: WorkItem[];
}

/**
 * Your next meetings with other people, each with recent items involving
 * the attendees. Composes `getAgenda` and `getRelatedToPeople` from any
 * sources that implement them.
 */
export async function fetchMeetingPrep(): Promise<Collected<MeetingPrep>> {
	const now = new Date();
	const backends = await connectedBackends();

	const agenda = await collectFromSources(
		backends.flatMap((backend) => {
			const getAgenda = backend.getAgenda;
			if (!getAgenda) return [];
			return {
				id: backend.id,
				fetch: async () =>
					unwrap(
						await withIntegration(backend, (ctx) =>
							getAgenda(ctx, {
								from: now,
								to: new Date(now.getTime() + PREP_WINDOW_MS),
							}),
						),
					),
			};
		}),
	);
	const meetings = sortByStart(agenda.items)
		.filter((e) => !e.allDay && (e.attendees?.length ?? 0) > 0)
		.slice(0, PREP_MEETING_LIMIT);

	const since = new Date(
		now.getTime() - WAITING_RULES.relatedWindowDays * DAY_MS,
	);
	const relatedSources = backends.flatMap((backend) => {
		const getRelated = backend.getRelatedToPeople;
		return getRelated ? [{ backend, getRelated }] : [];
	});
	const errors = [...agenda.errors];

	const items = await Promise.all(
		meetings.map(async (meeting) => {
			const people = (meeting.attendees ?? [])
				.map((a) => a.email)
				.slice(0, PREP_PEOPLE_LIMIT);
			const related = await collectFromSources(
				relatedSources.map(({ backend, getRelated }) => ({
					id: backend.id,
					fetch: async () =>
						unwrap(
							await withIntegration(backend, (ctx) =>
								getRelated(ctx, people, since),
							),
						),
				})),
			);
			errors.push(...related.errors);
			return { meeting, related: related.items };
		}),
	);

	// One error per source is enough.
	const seen = new Set<string | undefined>();
	return {
		items,
		errors: errors.filter(
			(e) => !seen.has(e.integrationId) && seen.add(e.integrationId),
		),
	};
}
