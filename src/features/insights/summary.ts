import type { ItemKind } from "#/components/source-kit/item-icon";
import type { ActivityItem, ActivityKind, MetricSeries } from "#/core/insights";
import { formatDuration } from "#/lib/time";

/** Which row icon each kind of activity gets. */
export const ACTIVITY_ITEM_KIND: Record<ActivityKind, ItemKind> = {
	pr_merged: "pull_request",
	pr_opened: "pull_request",
	pr_reviewed: "review_request",
	commit: "commit",
	issue_resolved: "issue",
	issue_worked: "issue",
	meeting: "meeting",
	email_sent: "email",
};

/** Order and wording of summary groups. Counted kinds become one line. */
export const ACTIVITY_GROUPS: {
	kind: ActivityKind;
	label: string;
	/** Too many to list in a standup: report a count instead. */
	countOnly?: boolean;
}[] = [
	{ kind: "pr_merged", label: "Merged" },
	{ kind: "issue_resolved", label: "Resolved" },
	{ kind: "commit", label: "Committed" },
	{ kind: "pr_opened", label: "Opened" },
	{ kind: "pr_reviewed", label: "Reviewed" },
	{ kind: "issue_worked", label: "Worked on" },
	{ kind: "meeting", label: "Meetings", countOnly: true },
	{ kind: "email_sent", label: "Emails sent", countOnly: true },
];

export interface ActivityGroup {
	kind: ActivityKind;
	label: string;
	countOnly: boolean;
	items: ActivityItem[];
}

/** Pure: activity grouped in display order (empty groups dropped). */
export function groupActivity(items: readonly ActivityItem[]): ActivityGroup[] {
	return ACTIVITY_GROUPS.map(({ kind, label, countOnly = false }) => ({
		kind,
		label,
		countOnly,
		items: items.filter((i) => i.kind === kind),
	})).filter((g) => g.items.length > 0);
}

/** Total meeting minutes from activity contexts isn't reliable: count only. */
const countLine = (group: ActivityGroup) =>
	group.kind === "meeting"
		? `${group.items.length} meeting${group.items.length === 1 ? "" : "s"}`
		: `${group.items.length} sent`;

/**
 * Pure: commits condensed per repo and branch (their `context`), busiest
 * first: "5 commits to acme/web (feature/cart): Fix rounding".
 */
export function summarizeCommits(items: readonly ActivityItem[]): string[] {
	const byPlace = new Map<string, ActivityItem[]>();
	for (const item of items) {
		const place = item.context ?? "unknown";
		byPlace.set(place, [...(byPlace.get(place) ?? []), item]);
	}
	return [...byPlace.entries()]
		.sort((a, b) => b[1].length - a[1].length)
		.map(([place, commits]) => {
			const latest = [...commits].sort(
				(a, b) => Date.parse(b.at) - Date.parse(a.at),
			)[0];
			const count = `${commits.length} commit${commits.length === 1 ? "" : "s"}`;
			return `${count} to ${place}${latest ? `: ${latest.title}` : ""}`;
		});
}

/** Pure: Markdown for a standup / weekly update, ready to paste. */
export function formatSummaryMarkdown(
	title: string,
	groups: readonly ActivityGroup[],
): string {
	if (groups.length === 0) return `**${title}**\n\nNothing recorded.`;
	const sections = groups.map((group) => {
		if (group.countOnly) return `**${group.label}:** ${countLine(group)}`;
		if (group.kind === "commit") {
			const lines = summarizeCommits(group.items).map((l) => `- ${l}`);
			return `**${group.label} (${group.items.length})**\n${lines.join("\n")}`;
		}
		const lines = group.items.map(
			(i) => `- ${i.title}${i.context ? ` (${i.context})` : ""}`,
		);
		return `**${group.label} (${group.items.length})**\n${lines.join("\n")}`;
	});
	return `**${title}**\n\n${sections.join("\n\n")}`;
}

export interface WeekComparison {
	/** The last complete week. */
	lastWeek: number | null;
	/** Average of the complete weeks before it. */
	average: number | null;
	/** Relative change of lastWeek vs average (0.2 = +20%), null when undefined. */
	change: number | null;
	/** The current, partial week. */
	thisWeek: number | null;
}

/** Pure: compares the last complete week with the ones before (current week excluded). */
export function compareWeeks(
	values: readonly (number | null)[],
): WeekComparison {
	const thisWeek = values.at(-1) ?? null;
	const lastWeek = values.at(-2) ?? null;
	const earlier = values.slice(0, -2).filter((v): v is number => v !== null);
	const average =
		earlier.length > 0
			? earlier.reduce((a, b) => a + b, 0) / earlier.length
			: null;
	const change =
		lastWeek !== null && average !== null && average > 0
			? (lastWeek - average) / average
			: null;
	return { lastWeek, average, change, thisWeek };
}

/** "12", "≈ 340", "12.5h", "2.3d", "—". */
export function formatMetric(
	value: number | null | undefined,
	series: Pick<MetricSeries, "unit" | "approximate">,
): string {
	if (value === null || value === undefined) return "—";
	const approx = series.approximate ? "≈ " : "";
	switch (series.unit) {
		case "hours":
			return `${approx}${formatDuration(value * 60)}`;
		case "days":
			return `${approx}${value.toFixed(1)}d`;
		default:
			return `${approx}${Math.round(value).toLocaleString()}`;
	}
}
