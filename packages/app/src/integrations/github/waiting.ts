import { type WaitingItem, waitedFor } from "@dashboard/core/waiting";
import type { GitHubSearchItem } from "./api/schemas";
import { toWorkItem } from "./mapper";

/** Pure: your ready PRs without any review → waiting items (oldest first). */
export function awaitingReviewToWaiting(
	prs: readonly GitHubSearchItem[],
	now: Date,
): WaitingItem[] {
	return prs
		.map((pr) => {
			const item = toWorkItem(pr, "pull_request");
			const since = pr.created_at ?? pr.updated_at;
			return {
				id: `${item.id}:waiting`,
				source: item.source,
				reason: "awaiting_review" as const,
				title: item.title,
				url: item.url,
				since: new Date(since).toISOString(),
				label: `No review for ${waitedFor(since, now)}`,
				context: item.context,
				detailRef: item.detailRef,
				project: item.project,
			};
		})
		.sort((a, b) => Date.parse(a.since) - Date.parse(b.since));
}
