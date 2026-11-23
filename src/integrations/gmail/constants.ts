import { ATTENTION_RULES } from "#/core/attention";
import { WAITING_RULES } from "#/core/waiting";

export const GMAIL_ID = "gmail";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

/** Messages fetched per list (each needs its own metadata request). */
export const MESSAGE_PAGE_SIZE = 15;

export const GMAIL_QUERIES = {
	unreadInbox: "is:unread in:inbox",
	starred: "is:starred",
	importantUnread: `is:unread is:important in:inbox newer_than:${ATTENTION_RULES.emailWindowDays}d`,
	/** Conversations you wrote in recently that may still lack an answer. */
	recentlySent: `in:sent newer_than:${WAITING_RULES.noReplyWindowDays}d older_than:${WAITING_RULES.noReplyAfterDays}d -in:chats`,
} as const;

/**
 * Gmail search for conversations with any of these people since `since`:
 * `{from:a to:a cc:a from:b …} after:2026/01/01` (braces = OR).
 */
export function withPeopleQuery(
	people: readonly string[],
	since: Date,
): string {
	const terms = people.flatMap((p) => [`from:${p}`, `to:${p}`, `cc:${p}`]);
	const day = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;
	return `{${terms.join(" ")}} after:${day} -in:chats`;
}
