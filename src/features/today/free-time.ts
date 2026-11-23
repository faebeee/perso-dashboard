import type { CalendarEvent } from "#/core/calendar-event";

export interface TimeBlock {
	start: Date;
	end: Date;
	minutes: number;
}

/**
 * Pure: gaps of at least `minMinutes` between timed events inside
 * `window` (your workday), counting only from `now` onwards. All-day events
 * don't block time; overlapping meetings are merged.
 */
export function freeBlocks(
	events: readonly CalendarEvent[],
	window: { start: Date; end: Date },
	now: Date,
	minMinutes = 30,
): TimeBlock[] {
	const from = Math.max(window.start.getTime(), now.getTime());
	const to = window.end.getTime();
	if (from >= to) return [];

	const busy = events
		.filter((e) => !e.allDay)
		.map((e) => [Date.parse(e.start), Date.parse(e.end)] as const)
		.filter(([s, e]) => e > from && s < to)
		.map(([s, e]) => [Math.max(s, from), Math.min(e, to)] as const)
		.sort((a, b) => a[0] - b[0]);

	const blocks: TimeBlock[] = [];
	let cursor = from;
	const addGap = (start: number, end: number) => {
		const minutes = Math.floor((end - start) / 60_000);
		if (minutes >= minMinutes) {
			blocks.push({ start: new Date(start), end: new Date(end), minutes });
		}
	};
	for (const [start, end] of busy) {
		if (start > cursor) addGap(cursor, start);
		cursor = Math.max(cursor, end);
	}
	if (cursor < to) addGap(cursor, to);
	return blocks;
}

/** Pure: minutes spent in timed events today (clipped to the day). */
export function meetingMinutes(
	events: readonly CalendarEvent[],
	day: { start: Date; end: Date },
): number {
	return events
		.filter((e) => !e.allDay)
		.reduce((sum, e) => {
			const s = Math.max(Date.parse(e.start), day.start.getTime());
			const end = Math.min(Date.parse(e.end), day.end.getTime());
			return sum + Math.max(0, (end - s) / 60_000);
		}, 0);
}
