import { z } from "zod";

/**
 * Normalized calendar event. Any calendar provider (Google, Outlook…) maps
 * into this so the agenda UI stays provider-agnostic.
 */
export const calendarEventSchema = z.object({
	/** Globally unique: `${source}:${nativeId}` */
	id: z.string(),
	source: z.string(),
	title: z.string(),
	url: z.string(),
	/** ISO date-time, or `YYYY-MM-DD` when allDay. */
	start: z.string(),
	/** ISO date-time, or exclusive `YYYY-MM-DD` when allDay. */
	end: z.string(),
	allDay: z.boolean(),
	location: z.string().optional(),
	/** Video call link (Meet, Zoom…). */
	meetingUrl: z.string().optional(),
	/** You organize it (vs. being invited). */
	isOrganizer: z.boolean(),
	/** Your RSVP when invited. */
	response: z.enum(["accepted", "tentative", "needsAction"]).optional(),
	/** Other people invited (not you, not rooms). */
	attendees: z
		.array(
			z.object({
				email: z.string(),
				name: z.string().optional(),
				response: z
					.enum(["accepted", "tentative", "declined", "needsAction"])
					.optional(),
			}),
		)
		.optional(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/** Comparable start timestamp; all-day events count from local midnight. */
export function eventStartMs(event: CalendarEvent): number {
	return event.allDay
		? new Date(`${event.start}T00:00:00`).getTime()
		: Date.parse(event.start);
}

export function sortByStart(events: readonly CalendarEvent[]): CalendarEvent[] {
	return [...events].sort((a, b) => eventStartMs(a) - eventStartMs(b));
}
