import { groupByDay, localDayKey } from "#/components/calendar/agenda-list";
import { type CalendarEvent, eventStartMs } from "#/core/calendar-event";
import type { TallyRow } from "#/lib/tally";

export interface CalendarSummary {
	/** Events on today's date, including ongoing and multi-day ones. */
	today: CalendarEvent[];
	/** Everything after today. */
	later: CalendarEvent[];
	/** The next timed event that hasn't started yet. */
	next: CalendarEvent | undefined;
	/** Timed events only; all-day events aren't meetings. */
	meetingCount: number;
	meetingMinutes: number;
	/** Invitations you haven't answered. */
	awaitingReply: number;
	/** Meeting minutes per day, in date order. */
	minutesByDay: TallyRow[];
}

const durationMinutes = (event: CalendarEvent) =>
	event.allDay
		? 0
		: Math.max(0, (Date.parse(event.end) - Date.parse(event.start)) / 60_000);

/** Pure: headline numbers for a list of upcoming events (sorted by start). */
export function summarizeEvents(
	events: readonly CalendarEvent[],
	now: number,
): CalendarSummary {
	const todayKey = localDayKey(now);
	const days = groupByDay(events, now);
	const timed = events.filter((e) => !e.allDay);

	return {
		today: days.find((d) => d.day === todayKey)?.events ?? [],
		later: days.filter((d) => d.day !== todayKey).flatMap((d) => d.events),
		next: timed.find((e) => eventStartMs(e) > now),
		meetingCount: timed.length,
		meetingMinutes: timed.reduce((sum, e) => sum + durationMinutes(e), 0),
		awaitingReply: events.filter((e) => e.response === "needsAction").length,
		minutesByDay: days.map((d) => ({
			label: d.label,
			value: d.events.reduce((sum, e) => sum + durationMinutes(e), 0),
		})),
	};
}
