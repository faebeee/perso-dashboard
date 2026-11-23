import type { CalendarEvent } from "#/core/calendar-event";
import type { GoogleEvent } from "./api/schemas";
import { GOOGLE_CALENDAR_ID } from "./constants";

const RESPONSES = new Set(["accepted", "tentative", "needsAction"]);
const ATTENDEE_RESPONSES = new Set([
	"accepted",
	"tentative",
	"declined",
	"needsAction",
]);
type AttendeeResponse = NonNullable<
	NonNullable<CalendarEvent["attendees"]>[number]["response"]
>;

/**
 * Pure: Google event → CalendarEvent. Returns null for events you won't
 * attend (cancelled, or declined).
 */
export function toCalendarEvent(event: GoogleEvent): CalendarEvent | null {
	if (event.status === "cancelled") return null;

	const self = event.attendees.find((a) => a.self);
	if (self?.responseStatus === "declined") return null;

	const start = event.start.dateTime ?? event.start.date;
	const end = event.end.dateTime ?? event.end.date;
	if (!start || !end) return null;

	const isOrganizer = event.organizer?.self ?? self === undefined;
	const response =
		!isOrganizer && self?.responseStatus && RESPONSES.has(self.responseStatus)
			? (self.responseStatus as CalendarEvent["response"])
			: undefined;

	return {
		id: `${GOOGLE_CALENDAR_ID}:${event.id}`,
		source: GOOGLE_CALENDAR_ID,
		title: event.summary?.trim() || "(no title)",
		url: event.htmlLink,
		start,
		end,
		allDay: !event.start.dateTime,
		location: event.location,
		meetingUrl:
			event.hangoutLink ??
			event.conferenceData?.entryPoints.find(
				(e) => e.entryPointType === "video",
			)?.uri,
		isOrganizer,
		response,
		attendees: event.attendees
			.filter((a) => !a.self && !a.resource && a.email)
			.map((a) => ({
				email: a.email ?? "",
				name: a.displayName,
				response: ATTENDEE_RESPONSES.has(a.responseStatus ?? "")
					? (a.responseStatus as AttendeeResponse)
					: undefined,
			})),
	};
}
