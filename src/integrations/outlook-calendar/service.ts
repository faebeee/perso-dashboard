import { type CalendarEvent, sortByStart } from "#/core/calendar-event";
import type { SettingOption } from "#/core/integration";
import type { WorkScope } from "#/core/work-scope";
import { settleLeniently } from "#/lib/collect-sources";
import type { OutlookCalendarApi } from "./api/client";
import type { GraphCalendarList } from "./api/schemas";
import { DEFAULT_CALENDAR, UPCOMING_DAYS } from "./constants";
import { toEventDetail } from "./detail";
import { parseEventDetailRef, toCalendarEvent } from "./mapper";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Work scope for events: "created" = you organize, "assigned" = you're invited. */
const matchesScope = (event: CalendarEvent, scope: WorkScope) =>
	scope === "all" ||
	(scope === "created" ? event.isOrganizer : !event.isOrganizer);

export interface OutlookCalendarServiceOptions {
	/** Calendars to read ("primary" = your default one). */
	calendarIds?: readonly string[];
	/** Your address, to tell you apart from other attendees. */
	accountEmail?: string;
}

export function createOutlookCalendarService(
	api: OutlookCalendarApi,
	now: () => Date = () => new Date(),
	{
		calendarIds = [DEFAULT_CALENDAR],
		accountEmail,
	}: OutlookCalendarServiceOptions = {},
) {
	// Default first, so it wins when the same meeting is on two calendars.
	const calendars = [...new Set(calendarIds)].sort(
		(a, b) => Number(b === DEFAULT_CALENDAR) - Number(a === DEFAULT_CALENDAR),
	);

	/**
	 * Events you'll attend in [from, to) across your selected calendars:
	 * declined and cancelled ones are dropped, duplicates merged. A calendar
	 * that fails (removed, no access) doesn't hide the others.
	 */
	async function between(
		from: Date,
		to: Date,
		top?: number,
	): Promise<CalendarEvent[]> {
		const perCalendar = await settleLeniently(
			calendars.map(async (calendarId) =>
				(await api.calendarView(calendarId, from, to, top)).value
					.map((event) => toCalendarEvent(event, calendarId, accountEmail))
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

		async eventDetail(ref: string) {
			const { calendarId, eventId } = parseEventDetailRef(ref);
			return toEventDetail(await api.event(calendarId, eventId), accountEmail);
		},

		async calendarOptions(): Promise<SettingOption[]> {
			return calendarOptions(await api.calendars());
		},

		async upcoming(scope: WorkScope): Promise<CalendarEvent[]> {
			const from = now();
			const to = new Date(from.getTime() + UPCOMING_DAYS * DAY_MS);
			return (await between(from, to)).filter((e) => matchesScope(e, scope));
		},
	};
}

/** Pure: calendar list → choices; your default calendar first, as "primary". */
export function calendarOptions(list: GraphCalendarList): SettingOption[] {
	return [...list.value]
		.sort(
			(a, b) =>
				Number(b.isDefaultCalendar ?? false) -
					Number(a.isDefaultCalendar ?? false) ||
				(a.name ?? a.id).localeCompare(b.name ?? b.id),
		)
		.map((calendar) => ({
			value: calendar.isDefaultCalendar ? DEFAULT_CALENDAR : calendar.id,
			label: calendar.name ?? calendar.id,
			description: [
				calendar.canEdit ? "Can edit" : "Can view",
				calendar.owner?.address,
			]
				.filter(Boolean)
				.join(" · "),
			color:
				calendar.hexColor && calendar.hexColor !== ""
					? calendar.hexColor
					: undefined,
			badge: calendar.isDefaultCalendar ? "Default" : undefined,
		}));
}
