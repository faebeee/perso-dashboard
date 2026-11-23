import type { AttentionItem } from "#/core/attention";
import type { WorkItem } from "#/core/work-item";
import { formatRelative } from "#/lib/time";

/** Pure: recent important unread mail (already filtered by query) → attention items. */
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
	}));
}
