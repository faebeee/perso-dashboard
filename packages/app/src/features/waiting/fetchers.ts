import {
	type CalendarEvent,
	sortByStart,
} from "@dashboard/core/calendar-event";
import type { IntegrationBackend } from "@dashboard/core/integration";
import { unwrap } from "@dashboard/core/result";
import type { WaitingItem } from "@dashboard/core/waiting";
import { sortByUpdatedDesc, type WorkItem } from "@dashboard/core/work-item";
import { withIntegration } from "@dashboard/platform/integration-runner";
import { preferences } from "@dashboard/platform/preferences";
import { getServices } from "@dashboard/platform/services";
import { integrationBackends } from "#/integrations/runtime-registry";
import { type Collected, collectFromSources } from "#/lib/collect-sources";
import { relatedQuery } from "./related-query";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Meeting prep looks this far ahead, for at most this many meetings. */
const PREP_WINDOW_MS = DAY_MS;
const PREP_MEETING_LIMIT = 3;

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
	/** Recent items about it: mail with the attendees, issues and PRs on its topic. */
	related: WorkItem[];
}

/**
 * Your next meetings with other people, each with recent related items:
 * mail with the attendees, issues and PRs on its topic. Composes
 * `getAgenda` and `getRelatedItems` from any sources that implement them.
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
		now.getTime() - preferences.get().waitingRules.relatedWindowDays * DAY_MS,
	);
	const relatedSources = backends.flatMap((backend) => {
		const getRelated = backend.getRelatedItems;
		return getRelated ? [{ backend, getRelated }] : [];
	});
	const errors = [...agenda.errors];

	const items = await Promise.all(
		meetings.map(async (meeting) => {
			const query = relatedQuery(meeting, since);
			const related = await collectFromSources(
				relatedSources.map(({ backend, getRelated }) => ({
					id: backend.id,
					fetch: async () =>
						unwrap(
							await withIntegration(backend, (ctx) => getRelated(ctx, query)),
						),
				})),
			);
			errors.push(...related.errors);
			return { meeting, related: sortByUpdatedDesc(related.items) };
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
