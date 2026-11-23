import type {
	AttendeeResponse,
	CalendarEvent,
} from "@dashboard/core/calendar-event";
import type { GraphEvent } from "./api/schemas";
import { DEFAULT_CALENDAR, OUTLOOK_CALENDAR_ID } from "./constants";

/**
 * detailRef of an event: the event id, prefixed with its calendar when it's
 * not your default one ("AAMkAD…|AAMkAG…").
 */
export const eventDetailRef = (calendarId: string, eventId: string) =>
	calendarId === DEFAULT_CALENDAR ? eventId : `${calendarId}|${eventId}`;

export function parseEventDetailRef(ref: string): {
	calendarId: string;
	eventId: string;
} {
	const bar = ref.lastIndexOf("|");
	return bar === -1
		? { calendarId: DEFAULT_CALENDAR, eventId: ref }
		: { calendarId: ref.slice(0, bar), eventId: ref.slice(bar + 1) };
}

/** Graph reply → the app's; "none" means no reply was asked for. */
export function toResponse(
	response: string | null | undefined,
): AttendeeResponse | undefined {
	switch (response) {
		case "accepted":
		case "organizer":
			return "accepted";
		case "tentativelyAccepted":
			return "tentative";
		case "declined":
			return "declined";
		case "notResponded":
			return "needsAction";
		default:
			return undefined;
	}
}

/**
 * Graph time in UTC (requested via Prefer) → ISO string. All-day events are
 * dates: their day is kept as `YYYY-MM-DD` (end exclusive, as with Google).
 */
export function toEventTime(dateTime: string, allDay: boolean): string {
	if (allDay) return dateTime.slice(0, 10);
	return /(Z|[+-]\d\d:\d\d)$/.test(dateTime)
		? new Date(dateTime).toISOString()
		: new Date(`${dateTime}Z`).toISOString();
}

export const meetingUrlOf = (event: GraphEvent) =>
	event.onlineMeeting?.joinUrl ?? event.onlineMeetingUrl ?? undefined;

export const eventUrl = (event: GraphEvent) =>
	event.webLink ?? "https://outlook.office.com/calendar/";

/**
 * Pure: Graph event → CalendarEvent. Returns null for events you won't
 * attend (cancelled, or declined). `accountEmail` tells you apart from
 * the other attendees.
 */
export function toCalendarEvent(
	event: GraphEvent,
	calendarId = DEFAULT_CALENDAR,
	accountEmail?: string,
): CalendarEvent | null {
	if (event.isCancelled) return null;
	const mine = toResponse(event.responseStatus?.response);
	if (mine === "declined") return null;

	const allDay = event.isAllDay ?? false;
	const me = accountEmail?.toLowerCase();
	const isOrganizer = event.isOrganizer ?? false;
	// Narrowed by the early return above: never "declined" here.
	const response = isOrganizer ? undefined : mine;

	return {
		id: `${OUTLOOK_CALENDAR_ID}:${event.id}`,
		source: OUTLOOK_CALENDAR_ID,
		title: event.subject?.trim() || "(no title)",
		url: eventUrl(event),
		start: toEventTime(event.start.dateTime, allDay),
		end: toEventTime(event.end.dateTime, allDay),
		allDay,
		detailRef: eventDetailRef(calendarId, event.id),
		location: event.location?.displayName?.trim() || undefined,
		meetingUrl: meetingUrlOf(event),
		isOrganizer,
		response,
		attendees: (event.attendees ?? [])
			.filter((a) => {
				const email = a.emailAddress?.address?.toLowerCase();
				return a.type !== "resource" && email && email !== me;
			})
			.map((a) => ({
				email: a.emailAddress?.address ?? "",
				name: a.emailAddress?.name ?? undefined,
				response: toResponse(a.status?.response) ?? "needsAction",
			})),
	};
}
