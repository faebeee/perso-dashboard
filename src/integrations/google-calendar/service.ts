import { type CalendarEvent, sortByStart } from "#/core/calendar-event";
import type { SettingOption } from "#/core/integration";
import type { WorkScope } from "#/core/work-scope";
import { settleLeniently } from "#/lib/collect-sources";
import type { GoogleCalendarApi } from "./api/client";
import type { GoogleCalendarList } from "./api/schemas";
import { UPCOMING_DAYS } from "./constants";
import { parseEventDetailRef, toEventDetail } from "./detail";
import { toCalendarEvent } from "./mapper";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Work scope for events: "created" = you organize, "assigned" = you're invited. */
const matchesScope = (event: CalendarEvent, scope: WorkScope) =>
	scope === "all" ||
	(scope === "created" ? event.isOrganizer : !event.isOrganizer);

export interface GoogleCalendarServiceOptions {
	/** Calendars to read ("primary" = yours). Defaults to your primary one. */
	calendarIds?: readonly string[];
}

export function createGoogleCalendarService(
	api: GoogleCalendarApi,
	now: () => Date = () => new Date(),
	{ calendarIds = ["primary"] }: GoogleCalendarServiceOptions = {},
) {
	// Primary first, so it wins when the same meeting is on two calendars.
	const calendars = [...new Set(calendarIds)].sort(
		(a, b) => Number(b === "primary") - Number(a === "primary"),
	);

	/**
	 * Events you'll attend in [from, to) across your selected calendars:
	 * declined and cancelled ones are dropped, duplicates merged. A calendar
	 * that fails (removed, no access) doesn't hide the others.
	 */
	async function between(
		from: Date,
		to: Date,
		maxResults?: number,
	): Promise<CalendarEvent[]> {
		const perCalendar = await settleLeniently(
			calendars.map(async (calendarId) =>
				(await api.listEvents(calendarId, from, to, maxResults)).items
					.map((event) => toCalendarEvent(event, calendarId))
					.filter((e): e is CalendarEvent => e !== null),
			),
		);
		const byId = new Map<string, CalendarEvent>();
		for (const event of perCalendar.flat()) {
			if (!byId.has(event.id)) byId.set(event.id, event);
		}
		return sortByStart([...byId.values()]);
	}

	return {
		between,

		/** One event for the detail view (see eventDetailRef). */
		async eventDetail(ref: string) {
			const { calendarId, eventId } = parseEventDetailRef(ref);
			return toEventDetail(await api.event(calendarId, eventId));
		},

		/** Your calendars, for choosing which ones to read. */
		async calendarOptions(): Promise<SettingOption[]> {
			return calendarOptions(await api.calendarList());
		},

		async upcoming(scope: WorkScope): Promise<CalendarEvent[]> {
			const from = now();
			const to = new Date(from.getTime() + UPCOMING_DAYS * DAY_MS);
			return (await between(from, to)).filter((e) => matchesScope(e, scope));
		},
	};
}

const ROLE_LABELS: Record<string, string> = {
	owner: "Yours",
	writer: "Can edit",
	reader: "Can view",
	freeBusyReader: "Free/busy only",
};

/** Pure: calendar list → choices; your primary calendar first, as "primary". */
export function calendarOptions(list: GoogleCalendarList): SettingOption[] {
	return [...list.items]
		.sort(
			(a, b) =>
				Number(b.primary ?? false) - Number(a.primary ?? false) ||
				(a.summaryOverride ?? a.summary).localeCompare(
					b.summaryOverride ?? b.summary,
				),
		)
		.map((calendar) => ({
			value: calendar.primary ? "primary" : calendar.id,
			label: calendar.summaryOverride ?? calendar.summary ?? calendar.id,
			description: [
				ROLE_LABELS[calendar.accessRole ?? ""],
				calendar.primary ? undefined : calendar.id,
			]
				.filter(Boolean)
				.join(" · "),
			color: calendar.backgroundColor,
			badge: calendar.primary ? "Primary" : undefined,
		}));
}
