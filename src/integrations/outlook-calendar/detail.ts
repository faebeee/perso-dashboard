import type { EventDetail } from "#/core/calendar-event";
import { textToHtml } from "#/lib/text-to-html";
import type { GraphEvent } from "./api/schemas";
import { eventUrl, meetingUrlOf, toEventTime, toResponse } from "./mapper";

/** Pure: Graph event → detail view model. Rooms aren't listed as people. */
export function toEventDetail(
	event: GraphEvent,
	accountEmail?: string,
): EventDetail {
	const me = accountEmail?.toLowerCase();
	const allDay = event.isAllDay ?? false;
	const organizerEmail = event.organizer?.emailAddress?.address ?? undefined;
	const isMe = (email: string | null | undefined) =>
		Boolean(me) && email?.toLowerCase() === me;
	const content = event.body?.content?.trim();

	return {
		title: event.subject?.trim() || "(no title)",
		url: eventUrl(event),
		start: toEventTime(event.start.dateTime, allDay),
		end: toEventTime(event.end.dateTime, allDay),
		allDay,
		location: event.location?.displayName?.trim() || undefined,
		meetingUrl: meetingUrlOf(event),
		organizer: event.organizer?.emailAddress
			? {
					name:
						event.organizer.emailAddress.name ?? organizerEmail ?? "Unknown",
					email: organizerEmail,
					you: event.isOrganizer ?? isMe(organizerEmail),
				}
			: null,
		attendees: (event.attendees ?? [])
			.filter((a) => a.type !== "resource")
			.map((a) => {
				const email = a.emailAddress?.address ?? undefined;
				const you = isMe(email);
				return {
					name: a.emailAddress?.name ?? email ?? "Unknown",
					email,
					// Your own reply is on the event; Graph often says "none" here.
					response:
						(you ? toResponse(event.responseStatus?.response) : undefined) ??
						toResponse(a.status?.response) ??
						"needsAction",
					you,
					optional: a.type === "optional",
					organizer:
						Boolean(email) &&
						email?.toLowerCase() === organizerEmail?.toLowerCase(),
				};
			}),
		descriptionHtml: content
			? event.body?.contentType?.toLowerCase() === "text"
				? textToHtml(content)
				: content
			: undefined,
	};
}
