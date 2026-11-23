import {
	type ActivityItem,
	countPerWeek,
	type MetricSeries,
	type WeekRange,
} from "@dashboard/core/insights";
import type { JiraIssue } from "./api/schemas";
import { JIRA_ID } from "./constants";
import { toWorkItem } from "./mapper";

/** Results per search for insights. */
export const INSIGHTS_PAGE_SIZE = 100;

/** JQL date, widened by a day: Jira evaluates it in your Jira profile's time zone. */
const jqlDay = (date: Date, shiftDays = 0) => {
	const d = new Date(date.getTime() + shiftDays * 86_400_000);
	return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

export const insightJql = {
	resolved: (from: Date, to: Date) =>
		`assignee = currentUser() AND resolved >= "${jqlDay(from, -1)}" AND resolved < "${jqlDay(to, 1)}" ORDER BY resolved DESC`,
	/** Issues you changed (any field, comment, transition) in the period. */
	workedOn: (from: Date, to: Date) =>
		`issuekey IN updatedBy(currentUser(), "${jqlDay(from, -1)}", "${jqlDay(to, 1)}") ORDER BY updated DESC`,
};

const within = (iso: string | null | undefined, from: Date, to: Date) => {
	if (!iso) return false;
	const t = Date.parse(iso);
	return t >= from.getTime() && t < to.getTime();
};

/** Pure: resolved and worked-on issues → activity; resolved wins over "worked on". */
export function issueActivity(
	found: { resolved: readonly JiraIssue[]; workedOn: readonly JiraIssue[] },
	siteUrl: string,
	from: Date,
	to: Date,
): ActivityItem[] {
	const toActivity = (
		issue: JiraIssue,
		kind: ActivityItem["kind"],
		at: string,
	): ActivityItem => {
		const item = toWorkItem(issue, siteUrl);
		return {
			id: `${item.id}:${kind}`,
			source: JIRA_ID,
			kind,
			title: item.title,
			url: item.url,
			at: new Date(at).toISOString(),
			context: [issue.key, item.status].filter(Boolean).join(" · "),
			detailRef: item.detailRef,
			project: item.project,
		};
	};
	const resolved = found.resolved.filter((i) =>
		within(i.fields.resolutiondate, from, to),
	);
	const resolvedIds = new Set(resolved.map((i) => i.id));
	return [
		...resolved.map((i) =>
			toActivity(
				i,
				"issue_resolved",
				i.fields.resolutiondate ?? i.fields.updated,
			),
		),
		...found.workedOn
			.filter(
				(i) => !resolvedIds.has(i.id) && within(i.fields.updated, from, to),
			)
			.map((i) => toActivity(i, "issue_worked", i.fields.updated)),
	];
}

/** Pure: issues resolved per week. */
export function issueMetrics(
	resolved: readonly JiraIssue[],
	weeks: readonly WeekRange[],
): MetricSeries[] {
	return [
		{
			id: "jira.issues-resolved",
			source: JIRA_ID,
			label: "Issues resolved",
			unit: "count",
			description: "Jira issues assigned to you that were resolved each week.",
			values: countPerWeek(
				resolved.flatMap((i) =>
					i.fields.resolutiondate ? [new Date(i.fields.resolutiondate)] : [],
				),
				weeks,
			),
		},
	];
}
