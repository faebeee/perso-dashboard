import {
	type AttentionItem,
	type AttentionRules,
	DEFAULT_ATTENTION_RULES,
	type Urgency,
} from "@dashboard/core/attention";
import type { Release } from "@dashboard/core/release";
import { localDayKey } from "#/lib/time";
import type { JiraIssue } from "./api/schemas";
import { toWorkItem } from "./mapper";

const DAY_MS = 24 * 60 * 60 * 1000;

const isOneOf = (list: readonly string[], value: string | undefined) =>
	value !== undefined && list.includes(value.toLowerCase());

/** Days between two YYYY-MM-DD keys (local dates). */
const daysBetween = (from: string, to: string) =>
	Math.round(
		(new Date(`${to}T00:00:00`).getTime() -
			new Date(`${from}T00:00:00`).getTime()) /
			DAY_MS,
	);

/**
 * Pure: my open issues → attention items. Overdue beats due today, which
 * beats priority. Unknown priority names are ignored (sites can rename them).
 */
export function issuesToAttention(
	issues: readonly JiraIssue[],
	siteUrl: string,
	now: Date,
	rules: AttentionRules = DEFAULT_ATTENTION_RULES,
): AttentionItem[] {
	const today = localDayKey(now.getTime());
	return issues.flatMap((issue): AttentionItem[] => {
		const item = toWorkItem(issue, siteUrl);
		const due = issue.fields.duedate ?? undefined;
		const priority = issue.fields.priority?.name;

		let rule:
			| { reason: AttentionItem["reason"]; urgency: Urgency; label: string }
			| undefined;
		if (due && due < today) {
			const days = daysBetween(due, today);
			rule = {
				reason: "overdue",
				urgency: "now",
				label: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
			};
		} else if (due === today) {
			rule = { reason: "due_today", urgency: "today", label: "Due today" };
		} else if (isOneOf(rules.criticalPriorities, priority)) {
			rule = {
				reason: "high_priority",
				urgency: "today",
				label: `${priority} priority`,
			};
		} else if (isOneOf(rules.highPriorities, priority)) {
			rule = {
				reason: "high_priority",
				urgency: "soon",
				label: `${priority} priority`,
			};
		}
		if (!rule) return [];

		return [
			{
				id: `${item.id}:attention`,
				source: item.source,
				...rule,
				title: item.title,
				url: item.url,
				at: due ? new Date(`${due}T00:00:00`).toISOString() : item.updatedAt,
				context: [item.context, item.status].filter(Boolean).join(" · "),
				actor: item.actor,
				detailRef: item.detailRef,
				project: item.project,
			},
		];
	});
}

/** Pure: fix versions past their release date that aren't released yet. */
export function overdueReleasesToAttention(
	releases: readonly Release[],
	now: Date,
): AttentionItem[] {
	return releases
		.filter((r) => r.state === "upcoming" && r.tags.includes("Overdue"))
		.map((r) => ({
			id: `${r.id}:attention`,
			source: r.source,
			reason: "overdue_release",
			urgency: "today",
			title: r.name,
			url: r.url,
			at: r.date
				? new Date(`${r.date}T00:00:00`).toISOString()
				: now.toISOString(),
			label: "Release overdue",
			context: r.project,
			project: r.project,
		}));
}
