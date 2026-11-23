import type { AttentionItem, Urgency } from "#/core/attention";
import type { SentryIssueInOrg } from "./api/schemas";
import { compactCount, toWorkItem } from "./mapper";

/**
 * Pure: unresolved issues assigned to you or your teams → attention items.
 *
 * - Escalating, regressed or fatal → "today" (yours or your team's).
 * - New and assigned to you personally → "soon".
 * - Everything else is ongoing noise and stays off the urgent list.
 */
export function issuesToAttention(
	issues: readonly SentryIssueInOrg[],
): AttentionItem[] {
	return issues.flatMap((issue): AttentionItem[] => {
		const mine = issue.assignedTo?.type === "user";
		let rule: { urgency: Urgency; label: string } | undefined;
		if (issue.substatus === "escalating") {
			rule = { urgency: "today", label: "Escalating" };
		} else if (issue.substatus === "regressed") {
			rule = { urgency: "today", label: "Regressed" };
		} else if (issue.level === "fatal") {
			rule = { urgency: "today", label: "Fatal" };
		} else if (issue.substatus === "new" && mine) {
			rule = { urgency: "soon", label: "New error" };
		}
		if (!rule) return [];

		const item = toWorkItem(issue);
		const team =
			issue.assignedTo?.type === "team" ? ` · #${issue.assignedTo.name}` : "";
		return [
			{
				id: `${item.id}:attention`,
				source: item.source,
				reason: "production_error",
				urgency: rule.urgency,
				title: item.title,
				url: item.url,
				at: item.updatedAt,
				label: `${rule.label} · ${compactCount(issue.count)} events${team}`,
				context: [issue.shortId, issue.project.name].join(" · "),
				detailRef: item.detailRef,
				project: issue.project.name,
			},
		];
	});
}
