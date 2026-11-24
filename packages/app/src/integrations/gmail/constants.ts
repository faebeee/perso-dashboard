import { DEFAULT_ATTENTION_RULES } from "@dashboard/core/attention";
import {
	DEFAULT_WAITING_RULES,
	type WaitingRules,
} from "@dashboard/core/waiting";

export const GMAIL_ID = "gmail";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

/** Messages fetched per list (each needs its own metadata request). */
export const MESSAGE_PAGE_SIZE = 15;

export const GMAIL_QUERIES = {
	unreadInbox: "is:unread in:inbox",
	starred: "is:starred",
	importantUnread: (
		emailWindowDays = DEFAULT_ATTENTION_RULES.emailWindowDays,
	) => `is:unread is:important in:inbox newer_than:${emailWindowDays}d`,
	/** Conversations you wrote in recently that may still lack an answer. */
	recentlySent: (rules: WaitingRules = DEFAULT_WAITING_RULES) =>
		`in:sent newer_than:${rules.noReplyWindowDays}d older_than:${rules.noReplyAfterDays}d -in:chats`,
} as const;

/** Pure: a plain address ("ada@acme.test"), nothing a search could parse as syntax. */
export const isPlainEmail = (value: string) =>
	/^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);

/**
 * Gmail search for conversations with any of these people since `since`:
 * `{from:a to:a cc:a from:b …} after:2026/01/01` (braces = OR).
 * Null when no address is usable.
 */
export function withPeopleQuery(
	people: readonly string[],
	since: Date,
): string | null {
	// Addresses come from calendar invites (anyone can send one): only plain
	// addresses, so a crafted one can't add search operators.
	const terms = people
		.filter(isPlainEmail)
		.flatMap((p) => [`from:${p}`, `to:${p}`, `cc:${p}`]);
	const day = `${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()}`;
	if (terms.length === 0) return null;
	return `{${terms.join(" ")}} after:${day} -in:chats`;
}
