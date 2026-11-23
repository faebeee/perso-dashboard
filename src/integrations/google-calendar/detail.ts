import { textToHtml } from "#/lib/text-to-html";
import type { GoogleEventDetail } from "./api/schemas";

/**
 * detailRef of an event: the event id, prefixed with its calendar when it's
 * not your primary one ("team@group.calendar.google.com|abc123").
 */
export const eventDetailRef = (calendarId: string, eventId: string) =>
	calendarId === "primary" ? eventId : `${calendarId}|${eventId}`;

export function parseEventDetailRef(ref: string): {
	calendarId: string;
	eventId: string;
} {
	const bar = ref.lastIndexOf("|");
	return bar === -1
		? { calendarId: "primary", eventId: ref }
		: { calendarId: ref.slice(0, bar), eventId: ref.slice(bar + 1) };
}

export type AttendeeResponse =
	| "accepted"
	| "tentative"
	| "declined"
	| "needsAction";

export interface EventDetail {
	title: string;
	url: string;
	start: string;
	end: string;
	allDay: boolean;
	location?: string;
	meetingUrl?: string;
	organizer: { name: string; email?: string; you: boolean } | null;
	/** Everyone invited (you included), grouped and counted by the view. */
	attendees: {
		name: string;
		email?: string;
		response: AttendeeResponse;
		you: boolean;
		optional: boolean;
		organizer: boolean;
	}[];
	/** Untrusted HTML (Google allows formatted descriptions). */
	descriptionHtml?: string;
}

const RESPONSES = new Set<string>([
	"accepted",
	"tentative",
	"declined",
	"needsAction",
]);

/** Google descriptions are either formatted HTML or plain text. */
const looksLikeHtml = (text: string) => /<\/?[a-z][\s\S]*>/i.test(text);

/** Pure: Google event → detail view model. Rooms aren't listed as people. */
export function toEventDetail(event: GoogleEventDetail): EventDetail {
	const description = event.description?.trim();
	return {
		title: event.summary?.trim() || "(no title)",
		url: event.htmlLink,
		start: event.start.dateTime ?? event.start.date ?? "",
		end: event.end.dateTime ?? event.end.date ?? "",
		allDay: !event.start.dateTime,
		location: event.location,
		meetingUrl:
			event.hangoutLink ??
			event.conferenceData?.entryPoints.find(
				(e) => e.entryPointType === "video",
			)?.uri,
		organizer: event.organizer
			? {
					name:
						event.organizer.displayName ?? event.organizer.email ?? "Unknown",
					email: event.organizer.email,
					you: event.organizer.self ?? false,
				}
			: null,
		attendees: event.attendees
			.filter((a) => !a.resource)
			.map((a) => ({
				name: a.displayName ?? a.email ?? "Unknown",
				email: a.email,
				response: RESPONSES.has(a.responseStatus ?? "")
					? (a.responseStatus as AttendeeResponse)
					: "needsAction",
				you: a.self ?? false,
				optional: a.optional ?? false,
				organizer: a.organizer ?? false,
			})),
		descriptionHtml: description
			? looksLikeHtml(description)
				? description
				: textToHtml(description)
			: undefined,
	};
}
