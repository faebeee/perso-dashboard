import type { CalendarEvent } from "#/core/calendar-event";
import type { ActivityItem, ActivityKind } from "#/core/insights";
import type { TodayItem } from "#/core/today";
import type { WaitingItem } from "#/core/waiting";
import { groupActivity, summarizeCommits } from "#/features/insights/summary";
import type { StandupSection } from "#/lib/standup";
import { formatDuration, localDayKey } from "#/lib/time";

/** One thing you did, for the timeline. */
export interface TimelineEntry {
	id: string;
	at: Date;
	/** "Merged", "Resolved", "Done", "Meeting"… */
	label: string;
	title: string;
	context?: string;
	source?: string;
	kind: ActivityKind | "today_done";
	url?: string;
	detailRef?: string;
}

export interface TimelineDay {
	day: string;
	label: string;
	entries: TimelineEntry[];
}

export interface DailyReview {
	timeline: TimelineDay[];
	done: StandupSection;
	today: StandupSection;
	blockers: StandupSection;
}

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
	pr_merged: "Merged",
	pr_opened: "Opened",
	pr_reviewed: "Reviewed",
	commit: "Committed",
	issue_resolved: "Resolved",
	issue_worked: "Worked on",
	meeting: "Meeting",
	email_sent: "Sent",
};

/** Blockers shown in the standup (the page lists them all). */
const BLOCKER_LIMIT = 5;

const withContext = (title: string, context?: string) =>
	context ? `${title} (${context})` : title;

function dayLabel(key: string, now: Date): string {
	const today = localDayKey(now.getTime());
	const yesterday = localDayKey(now.getTime() - 86_400_000);
	if (key === today) return "Today";
	if (key === yesterday) return "Yesterday";
	return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
		weekday: "long",
		day: "numeric",
		month: "short",
	});
}

/**
 * Pure: everything for the daily review and the standup text.
 *
 * - Done: activity (grouped like the Insights summary) plus Today-list items
 *   you ticked off. Meetings and sent mail become one count line each.
 * - Today: open Today items, then today's meetings as one line.
 * - Blockers: what you're waiting on others for, oldest first.
 */
export function buildDailyReview(input: {
	activity: readonly ActivityItem[];
	completed: readonly TodayItem[];
	openToday: readonly TodayItem[];
	agenda: readonly CalendarEvent[];
	waiting: readonly WaitingItem[];
	now: Date;
}): DailyReview {
	const { now } = input;

	const entries: TimelineEntry[] = [
		...input.activity.map((a) => ({
			id: a.id,
			at: new Date(a.at),
			label: ACTIVITY_LABELS[a.kind],
			title: a.title,
			context: a.context,
			source: a.source,
			kind: a.kind,
			url: a.url,
			detailRef: a.detailRef,
		})),
		...input.completed.flatMap((t) =>
			t.doneAt
				? [
						{
							id: `today:${t.id}`,
							at: t.doneAt,
							label: "Done",
							title: t.title,
							source: t.ref?.source,
							kind: "today_done" as const,
							url: t.ref?.url,
							detailRef: t.ref?.detailRef,
						},
					]
				: [],
		),
	].sort((a, b) => b.at.getTime() - a.at.getTime());

	const byDay = new Map<string, TimelineEntry[]>();
	for (const entry of entries) {
		const key = localDayKey(entry.at.getTime());
		byDay.set(key, [...(byDay.get(key) ?? []), entry]);
	}
	const timeline = [...byDay.entries()]
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([day, dayEntries]) => ({
			day,
			label: dayLabel(day, now),
			entries: dayEntries,
		}));

	// Today-list items that point at something already in the activity
	// (e.g. a pinned PR that got merged) aren't repeated.
	const activityUrls = new Set(input.activity.map((a) => a.url));
	const doneLines = [
		...groupActivity(input.activity).flatMap((group) =>
			group.countOnly
				? [
						group.kind === "meeting"
							? `${group.items.length} meeting${group.items.length === 1 ? "" : "s"}`
							: `${group.items.length} email${group.items.length === 1 ? "" : "s"} sent`,
					]
				: group.kind === "commit"
					? summarizeCommits(group.items).map((line) => `Committed ${line}`)
					: group.items.map(
							(i) => `${group.label}: ${withContext(i.title, i.context)}`,
						),
		),
		...input.completed
			.filter((t) => !t.ref || !activityUrls.has(t.ref.url))
			.map((t) => `Done: ${t.title}`),
	];

	const meetings = input.agenda.filter((e) => !e.allDay);
	const meetingMinutes = meetings.reduce(
		(sum, e) => sum + (Date.parse(e.end) - Date.parse(e.start)) / 60_000,
		0,
	);
	const todayLines = [
		...input.openToday.map((t) => t.title),
		...(meetings.length > 0
			? [
					`${meetings.length} meeting${meetings.length === 1 ? "" : "s"} (${formatDuration(meetingMinutes)})`,
				]
			: []),
	];

	const blockerLines = [...input.waiting]
		.sort((a, b) => Date.parse(a.since) - Date.parse(b.since))
		.slice(0, BLOCKER_LIMIT)
		.map((w) => `${w.label}: ${withContext(w.title, w.context)}`);

	return {
		timeline,
		done: { title: "Done", lines: doneLines },
		today: { title: "Today", lines: todayLines },
		blockers: { title: "Blockers", lines: blockerLines },
	};
}
