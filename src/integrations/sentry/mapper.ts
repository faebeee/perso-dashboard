import { makeWorkItemId, type WorkItem } from "#/core/work-item";
import type { SentryIssueInOrg } from "./api/schemas";
import { SENTRY_ID } from "./constants";

const SUBSTATUS_LABELS: Record<string, string> = {
	new: "New",
	escalating: "Escalating",
	regressed: "Regressed",
	ongoing: "Ongoing",
};

/** "1234567" → "1.2M", "4321" → "4.3k". */
export function compactCount(count: string | number): string {
	const n = Number(count);
	if (!Number.isFinite(n)) return String(count);
	return new Intl.NumberFormat("en", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(n);
}

/** Pure: Sentry issue → WorkItem. */
export function toWorkItem(issue: SentryIssueInOrg): WorkItem {
	const level = issue.level.charAt(0).toUpperCase() + issue.level.slice(1);
	return {
		id: makeWorkItemId(SENTRY_ID, issue.id),
		source: SENTRY_ID,
		kind: "error",
		title: issue.title,
		url: issue.permalink,
		updatedAt: new Date(issue.lastSeen).toISOString(),
		context: [issue.shortId, issue.culprit].filter(Boolean).join(" · "),
		project: issue.project.name,
		detailRef: issue.orgSlug ? `${issue.orgSlug}:${issue.id}` : undefined,
		status: issue.substatus
			? (SUBSTATUS_LABELS[issue.substatus] ?? undefined)
			: undefined,
		assignee: issue.assignedTo ? { name: issue.assignedTo.name } : null,
		tags: [
			level,
			`${compactCount(issue.count)} events`,
			`${compactCount(issue.userCount)} users`,
		],
	};
}
