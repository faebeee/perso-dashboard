import {
	type AttentionItem,
	type AttentionRules,
	DEFAULT_ATTENTION_RULES,
} from "#/core/attention";
import type { WorkItem } from "#/core/work-item";
import { formatRelative } from "#/lib/time";
import { PR_SIGNAL_LABELS, type PrNeedingAction } from "./service";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Pure: open review requests → attention items. Someone is blocked on you;
 * PRs without activity for a day get escalated to "today".
 */
export function reviewRequestsToAttention(
	reviews: readonly WorkItem[],
	now: Date,
	rules: AttentionRules = DEFAULT_ATTENTION_RULES,
): AttentionItem[] {
	return reviews.map((pr) => {
		const ageMs = now.getTime() - Date.parse(pr.updatedAt);
		const stale = ageMs > rules.reviewStaleHours * HOUR_MS;
		return {
			id: `${pr.id}:attention`,
			source: pr.source,
			reason: "review_requested",
			urgency: stale ? "today" : "soon",
			title: pr.title,
			url: pr.url,
			at: pr.updatedAt,
			label: stale
				? `Review waiting since ${formatRelative(pr.updatedAt, now.getTime())}`
				: "Review requested",
			context: pr.context,
			actor: pr.actor,
			detailRef: pr.detailRef,
			project: pr.project,
		};
	});
}

/**
 * Pure: your own PRs blocked on you → attention items ("today"). Changes
 * requested takes precedence as the reason; the label lists every signal.
 */
export function prSignalsToAttention(
	prs: readonly PrNeedingAction[],
): AttentionItem[] {
	return prs.map(({ item, signals }) => ({
		id: `${item.id}:signals`,
		source: item.source,
		reason: signals.includes("changes_requested")
			? "changes_requested"
			: "checks_failing",
		urgency: "today",
		title: item.title,
		url: item.url,
		at: item.updatedAt,
		label: signals.map((s) => PR_SIGNAL_LABELS[s]).join(" · "),
		context: item.context,
		detailRef: item.detailRef,
		project: item.project,
	}));
}
