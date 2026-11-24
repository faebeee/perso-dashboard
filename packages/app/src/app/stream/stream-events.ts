import type { ActivityItem, ActivityKind } from "@dashboard/core/insights";
import type { WorkItem, WorkItemKind } from "@dashboard/core/work-item";
import { ACTIVITY_ITEM_KIND } from "#/features/insights/summary";
import { type StreamEvent, streamEventId } from "#/features/stream/stream";

const ITEM_VERBS: Record<WorkItemKind, string> = {
	pull_request: "Pull request updated",
	assigned_pull_request: "Pull request updated",
	review_request: "Review requested",
	issue: "Ticket updated",
	email: "Email",
	error: "Error",
	security_alert: "Security alert",
};

/** Meetings are on the calendar, not news: they stay out of the stream. */
const ACTIVITY_VERBS: Record<Exclude<ActivityKind, "meeting">, string> = {
	pr_merged: "You merged",
	pr_opened: "You opened",
	pr_reviewed: "You reviewed",
	commit: "Commit",
	issue_resolved: "You resolved",
	issue_worked: "You worked on",
	email_sent: "You sent",
};

/** Pure: each feed item's latest change as a stream entry. */
export function eventsFromWorkItems(items: readonly WorkItem[]): StreamEvent[] {
	return items.map((item) => ({
		id: streamEventId(item.id, item.updatedAt),
		itemId: item.id,
		source: item.source,
		kind: item.kind,
		verb: ITEM_VERBS[item.kind],
		title: item.title,
		url: item.url,
		at: item.updatedAt,
		context: item.context,
		status: item.status,
		actor: item.actor,
		detailRef: item.detailRef,
	}));
}

/** Pure: things done (commits, merges, sent mail) as stream entries. */
export function eventsFromActivity(
	items: readonly ActivityItem[],
): StreamEvent[] {
	return items.flatMap((item) => {
		if (item.kind === "meeting") return [];
		return {
			id: streamEventId(item.id, item.at),
			itemId: item.id,
			source: item.source,
			kind: ACTIVITY_ITEM_KIND[item.kind],
			verb: ACTIVITY_VERBS[item.kind],
			title: item.title,
			url: item.url,
			at: item.at,
			context: item.context ?? item.project,
			detailRef: item.detailRef,
		};
	});
}
