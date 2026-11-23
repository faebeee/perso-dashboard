import "@tanstack/react-start/server-only";
import { type CalendarEvent, sortByStart } from "#/core/calendar-event";
import type { WorkScope } from "#/core/work-scope";
import type { GoogleCalendarApi } from "./api/client";
import { UPCOMING_DAYS } from "./constants";
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
	return {
		async upcoming(scope: WorkScope): Promise<CalendarEvent[]> {
			const from = now();
			const to = new Date(from.getTime() + UPCOMING_DAYS * DAY_MS);
			const res = await api.listEvents(from, to);
			const events = res.items
				.map(toCalendarEvent)
				.filter((e): e is CalendarEvent => e !== null)
				.filter((e) => matchesScope(e, scope));
			return sortByStart(events);
		},
	};
}
