import { type WaitingItem, waitedFor } from "#/core/waiting";
import type { JiraIssue } from "./api/schemas";
import { toWorkItem } from "./mapper";

/** Pure: issues you reported that nobody picked up → waiting items. */
export function unassignedToWaiting(
	issues: readonly JiraIssue[],
	siteUrl: string,
	now: Date,
): WaitingItem[] {
	return issues.map((issue) => {
		const item = toWorkItem(issue, siteUrl);
		const since = issue.fields.created ?? issue.fields.updated;
		return {
			id: `${item.id}:waiting`,
			source: item.source,
			reason: "unassigned",
			title: item.title,
			url: item.url,
			since: new Date(since).toISOString(),
			label: `Unassigned for ${waitedFor(since, now)}`,
			context: [item.context, item.status].filter(Boolean).join(" · "),
			detailRef: item.detailRef,
			project: item.project,
		};
	});
}
