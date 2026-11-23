import { type CalendarEvent, sortByStart } from "#/core/calendar-event";
import type { WorkScope } from "#/core/work-scope";
import type { GoogleCalendarApi } from "./api/client";
import { UPCOMING_DAYS } from "./constants";
import { toEventDetail } from "./detail";
import { toCalendarEvent } from "./mapper";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Work scope for events: "created" = you organize, "assigned" = you're invited. */
const matchesScope = (event: CalendarEvent, scope: WorkScope) =>
	scope === "all" ||
	(scope === "created" ? event.isOrganizer : !event.isOrganizer);

export function createGoogleCalendarService(
	api: GoogleCalendarApi,
	now: () => Date = () => new Date(),
) {
	/** Events you'll attend in [from, to): declined and cancelled ones are dropped. */
	async function between(
		from: Date,
		to: Date,
		maxResults?: number,
	): Promise<CalendarEvent[]> {
		const res = await api.listEvents(from, to, maxResults);
		return sortByStart(
			res.items
				.map(toCalendarEvent)
				.filter((e): e is CalendarEvent => e !== null),
		);
	}

	return {
		between,

		/** One event for the detail view (`detailRef` = Google event id). */
		eventDetail: async (id: string) => toEventDetail(await api.event(id)),

		async upcoming(scope: WorkScope): Promise<CalendarEvent[]> {
			const from = now();
			const to = new Date(from.getTime() + UPCOMING_DAYS * DAY_MS);
			return (await between(from, to)).filter((e) => matchesScope(e, scope));
		},
	};
}
