import { makeWorkItemId, type WorkItem } from "@dashboard/core/work-item";
import type { GmailMessage } from "./api/schemas";
import { GMAIL_ID } from "./constants";

/** Pure: Gmail message metadata → WorkItem. */
export function toWorkItem(
	message: GmailMessage,
	accountEmail?: string,
): WorkItem {
	const header = (name: string) =>
		message.payload.headers.find(
			(h) => h.name.toLowerCase() === name.toLowerCase(),
		)?.value;

	return {
		id: makeWorkItemId(GMAIL_ID, message.id),
		source: GMAIL_ID,
		kind: "email",
		title: header("Subject")?.trim() || "(no subject)",
		url: gmailThreadUrl(message.threadId, accountEmail),
		updatedAt: new Date(Number(message.internalDate)).toISOString(),
		context: decodeEntities(message.snippet),
		actor: { name: senderName(header("From") ?? "Unknown sender") },
		tags: message.labelIds.includes("IMPORTANT") ? ["Important"] : [],
		detailRef: message.id,
	};
}

/**
 * Web link to a conversation. `authuser` picks the right signed-in account
 * (Gmail's account slot in the path only takes an index), and `#all/` finds
 * the thread whatever its labels (starred or archived mail isn't in #inbox).
 */
export function gmailThreadUrl(
	threadId: string,
	accountEmail?: string,
): string {
	const url = new URL("https://mail.google.com/mail/");
	if (accountEmail) url.searchParams.set("authuser", accountEmail);
	url.hash = `all/${threadId}`;
	return url.toString();
}

/** `"Jane Doe" <jane@x.com>` → `Jane Doe`; `jane@x.com` → `jane@x.com` */
export function senderName(from: string): string {
	const match = from.match(/^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/);
	return match?.[1]?.trim() || from.replace(/[<>]/g, "").trim();
}

const ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&nbsp;": " ",
};

/** Gmail snippets are HTML-escaped. */
export function decodeEntities(text: string): string {
	return text
		.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
