import type { AttentionItem } from "#/core/attention";
import type { CalendarEvent } from "#/core/calendar-event";
import { formatDuration } from "#/lib/time";
import { freeBlocks, meetingMinutes, type TimeBlock } from "./free-time";

export interface Briefing {
	meetings: CalendarEvent[];
	meetingMinutes: number;
	/** Next timed meeting that hasn't started yet. */
	nextMeeting: CalendarEvent | undefined;
	free: TimeBlock[];
	freeMinutes: number;
	/** Overdue or due-today issues. */
	due: AttentionItem[];
	/** Review requests and unanswered invitations. */
	waitingOnYou: AttentionItem[];
	/** Escalating, regressed, fatal or new errors. */
	errors: AttentionItem[];
}

export interface Workday {
	start: Date;
	end: Date;
}

/** Pure: what your day looks like, from the agenda and the urgent items. */
export function buildBriefing(
	agenda: readonly CalendarEvent[],
	urgent: readonly AttentionItem[],
	workday: Workday,
	now: Date,
): Briefing {
	const meetings = agenda.filter((e) => !e.allDay);
	const free = freeBlocks(agenda, workday, now);
	const dayBounds = {
		start: new Date(new Date(now).setHours(0, 0, 0, 0)),
		end: new Date(new Date(now).setHours(23, 59, 59, 999)),
	};
	return {
		meetings,
		meetingMinutes: meetingMinutes(agenda, dayBounds),
		nextMeeting: meetings.find((e) => Date.parse(e.start) > now.getTime()),
		free,
		freeMinutes: free.reduce((sum, b) => sum + b.minutes, 0),
		due: urgent.filter(
			(i) => i.reason === "overdue" || i.reason === "due_today",
		),
		waitingOnYou: urgent.filter(
			(i) => i.reason === "review_requested" || i.reason === "invitation",
		),
		errors: urgent.filter((i) => i.reason === "production_error"),
	};
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One line for the morning notification. */
export function briefingSummary(b: Briefing): string {
	const parts = [
		b.meetings.length > 0
			? `${plural(b.meetings.length, "meeting")} (${formatDuration(b.meetingMinutes)})`
			: "No meetings",
		b.freeMinutes > 0 ? `${formatDuration(b.freeMinutes)} free` : undefined,
		b.due.length > 0 ? `${b.due.length} due` : undefined,
		b.waitingOnYou.length > 0
			? `${plural(b.waitingOnYou.length, "thing")} waiting on you`
			: undefined,
		b.errors.length > 0 ? plural(b.errors.length, "urgent error") : undefined,
	];
	return parts.filter(Boolean).join(" · ");
}

/** Your workday on a given date, from "HH:MM" minutes. */
export function workdayOn(
	date: Date,
	startMinutes: number,
	endMinutes: number,
): Workday {
	const at = (minutes: number) => {
		const d = new Date(date);
		d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
		return d;
	};
	return { start: at(startMinutes), end: at(endMinutes) };
}
