import type { CalendarEvent } from "#/core/calendar-event";
import {
	type ActivityItem,
	type MetricSeries,
	type WeekRange,
	weekIndexOf,
} from "#/core/insights";
import { formatDuration } from "#/lib/time";
import { GOOGLE_CALENDAR_ID } from "./constants";

const minutes = (e: CalendarEvent, until: number) =>
	Math.max(
		0,
		(Math.min(Date.parse(e.end), until) - Date.parse(e.start)) / 60_000,
	);

/** Pure: meetings that started in [from, to) → activity. All-day events aren't meetings. */
export function meetingActivity(
	events: readonly CalendarEvent[],
	from: Date,
	to: Date,
): ActivityItem[] {
	return events
		.filter((e) => {
			const start = Date.parse(e.start);
			return !e.allDay && start >= from.getTime() && start < to.getTime();
		})
		.map((e) => ({
			id: `${e.id}:meeting`,
			source: GOOGLE_CALENDAR_ID,
			kind: "meeting" as const,
			title: e.title,
			url: e.url,
			at: new Date(e.start).toISOString(),
			context: [
				formatDuration(minutes(e, Date.parse(e.end))),
				e.attendees?.length ? `${e.attendees.length + 1} people` : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		}));
}

/** Pure: hours in meetings per week, counting only time that has passed. */
export function meetingMetrics(
	events: readonly CalendarEvent[],
	weeks: readonly WeekRange[],
	now: Date,
): MetricSeries[] {
	const hours = weeks.map(() => 0);
	for (const e of events) {
		if (e.allDay) continue;
		const i = weekIndexOf(new Date(e.start), weeks);
		if (i >= 0) hours[i] = (hours[i] ?? 0) + minutes(e, now.getTime()) / 60;
	}
	return [
		{
			id: "calendar.meeting-hours",
			source: GOOGLE_CALENDAR_ID,
			label: "Time in meetings",
			unit: "hours",
			description:
				"Hours in timed events you attended (declined ones don't count).",
			values: hours.map((h) => Math.round(h * 10) / 10),
		},
	];
}
