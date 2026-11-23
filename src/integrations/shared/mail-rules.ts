import type { AttentionItem } from "#/core/attention";
import type { ActivityItem } from "#/core/insights";
import type { WorkItem } from "#/core/work-item";
import { formatRelative } from "#/lib/time";

/**
 * Shared by every mail integration. Pure: recent important unread mail
 * (already filtered by the provider's query) → attention items.
 */
export function importantMailToAttention(
	messages: readonly WorkItem[],
	now: Date,
): AttentionItem[] {
	return messages.map((mail) => ({
		id: `${mail.id}:attention`,
		source: mail.source,
		reason: "important_email",
		urgency: "soon",
		title: mail.title,
		url: mail.url,
		at: mail.updatedAt,
		label: `Important · ${formatRelative(mail.updatedAt, now.getTime())}`,
		context: mail.context,
		actor: mail.actor,
		detailRef: mail.detailRef,
	}));
}

/** Pure: messages you sent → activity (Insights, standup). */
export function sentActivity(sent: readonly WorkItem[]): ActivityItem[] {
	return sent.map((mail) => ({
		id: `${mail.id}:sent`,
		source: mail.source,
		kind: "email_sent",
		title: mail.title,
		url: mail.url,
		at: mail.updatedAt,
		context: mail.context,
		detailRef: mail.detailRef,
	}));
}
