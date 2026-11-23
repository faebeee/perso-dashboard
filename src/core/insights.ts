/** What you did (Summary) and how your weeks look (Trends). */

export type ActivityKind =
	| "pr_merged"
	| "pr_opened"
	| "pr_reviewed"
	| "issue_resolved"
	| "issue_worked"
	| "meeting"
	| "email_sent";

export interface ActivityItem {
	/** Globally unique: `${source}:${nativeId}` (+ kind when needed). */
	id: string;
	source: string;
	kind: ActivityKind;
	title: string;
	url: string;
	/** ISO: when it happened. */
	at: string;
	context?: string;
	detailRef?: string;
}

/** A calendar week, Monday 00:00 to the next Monday 00:00 (local time). */
export interface WeekRange {
	start: Date;
	end: Date;
}

export interface MetricSeries {
	/** Stable id, e.g. "github.prs-merged". */
	id: string;
	source: string;
	label: string;
	unit: "count" | "hours" | "days";
	description: string;
	/** Values are estimates (e.g. Gmail's result counts). */
	approximate?: boolean;
	/** One per week, aligned with the requested weeks; null = no data. */
	values: (number | null)[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 (local) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
	return d;
}

/** The last `count` weeks, oldest first; the last one is the current (partial) week. */
export function lastWeeks(count: number, now: Date): WeekRange[] {
	const current = startOfWeek(now);
	return Array.from({ length: count }, (_, i) => {
		const start = new Date(current);
		start.setDate(start.getDate() - (count - 1 - i) * 7);
		const end = new Date(start);
		end.setDate(end.getDate() + 7);
		return { start, end };
	});
}

/** Index of the week containing `date`, or -1. */
export function weekIndexOf(date: Date, weeks: readonly WeekRange[]): number {
	const t = date.getTime();
	return weeks.findIndex((w) => t >= w.start.getTime() && t < w.end.getTime());
}

/** Pure: how many of `dates` fall in each week. */
export function countPerWeek(
	dates: readonly Date[],
	weeks: readonly WeekRange[],
): number[] {
	const counts = weeks.map(() => 0);
	for (const date of dates) {
		const i = weekIndexOf(date, weeks);
		if (i >= 0) counts[i] = (counts[i] ?? 0) + 1;
	}
	return counts;
}

/** Pure: median of `values` per week (null for weeks without values). */
export function medianPerWeek(
	entries: readonly { at: Date; value: number }[],
	weeks: readonly WeekRange[],
): (number | null)[] {
	const groups = weeks.map((): number[] => []);
	for (const { at, value } of entries) {
		const i = weekIndexOf(at, weeks);
		if (i >= 0) groups[i]?.push(value);
	}
	return groups.map(median);
}

export function median(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? (sorted[mid] ?? null)
		: ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export const daysBetween = (from: Date, to: Date) =>
	(to.getTime() - from.getTime()) / DAY_MS;

export type SummaryRange =
	| "since_last_workday"
	| "last_24_hours"
	| "this_week"
	| "last_week";

/**
 * Pure: the period a summary covers. "Since last workday" starts at 00:00 of
 * the previous weekday (Friday when it's Monday), the usual standup window.
 */
export function summaryRange(
	range: SummaryRange,
	now: Date,
): { from: Date; to: Date; title: string } {
	const weekStart = startOfWeek(now);
	switch (range) {
		case "this_week":
			return { from: weekStart, to: now, title: "This week" };
		case "last_week": {
			const from = new Date(weekStart);
			from.setDate(from.getDate() - 7);
			return { from, to: weekStart, title: "Last week" };
		}
		case "last_24_hours":
			return {
				from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
				to: now,
				title: "Last 24 hours",
			};
		case "since_last_workday": {
			const from = new Date(now);
			from.setHours(0, 0, 0, 0);
			const back = { 0: 2, 1: 3, 6: 1 }[from.getDay()] ?? 1; // Sun→Fri, Mon→Fri, Sat→Fri
			from.setDate(from.getDate() - back);
			const name = from.toLocaleDateString(undefined, { weekday: "long" });
			return {
				from,
				to: now,
				title: back === 1 ? "Since yesterday" : `Since ${name}`,
			};
		}
	}
}
