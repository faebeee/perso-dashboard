import { ATTENTION_RULES, type AttentionItem } from "#/core/attention";
import type { WorkItem } from "#/core/work-item";
import { formatRelative } from "#/lib/time";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Pure: open review requests → attention items. Someone is blocked on you;
 * PRs without activity for a day get escalated to "today".
 */
export function reviewRequestsToAttention(
	reviews: readonly WorkItem[],
	now: Date,
): AttentionItem[] {
	return reviews.map((pr) => {
		const ageMs = now.getTime() - Date.parse(pr.updatedAt);
		const stale = ageMs > ATTENTION_RULES.reviewStaleHours * HOUR_MS;
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
		};
	});
}
