import {
	DEFAULT_WAITING_RULES,
	type WaitingItem,
	type WaitingRules,
	waitedFor,
} from "#/core/waiting";
import type { GraphMessage, GraphMessageList } from "./api/schemas";
import { OUTLOOK_ID } from "./constants";
import { messageDate, messageUrl, toAddress, toAddresses } from "./mapper";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A message you sent, and the rest of its conversation. */
export interface SentConversation {
	sent: GraphMessage;
	conversation: GraphMessageList;
}

/** Pure: the newest sent message per conversation (lists are newest first). */
export function latestPerConversation(
	sent: readonly GraphMessage[],
): GraphMessage[] {
	const seen = new Set<string>();
	return sent.filter((m) => {
		const key = m.conversationId ?? m.id;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Pure: conversations where your message is still the last one after
 * `noReplyAfterDays` → waiting items, oldest first. Notes to yourself
 * aren't waiting on anybody.
 */
export function unansweredToWaiting(
	conversations: readonly SentConversation[],
	accountEmail: string | undefined,
	now: Date,
	rules: WaitingRules = DEFAULT_WAITING_RULES,
): WaitingItem[] {
	const me = accountEmail?.toLowerCase();
	const isMe = (email: string) => Boolean(me) && email.toLowerCase() === me;

	return conversations
		.flatMap(({ sent, conversation }): WaitingItem[] => {
			const sentAt = Date.parse(sent.sentDateTime ?? messageDate(sent));
			if (now.getTime() - sentAt < rules.noReplyAfterDays * DAY_MS) return [];
			const answered = conversation.value.some((m) => {
				const from = toAddress(m.from)?.email ?? "";
				const at = Date.parse(m.receivedDateTime ?? m.sentDateTime ?? "");
				return m.id !== sent.id && at > sentAt && !isMe(from);
			});
			if (answered) return [];

			const recipients = toAddresses(sent.toRecipients);
			if (recipients.length > 0 && recipients.every((r) => isMe(r.email))) {
				return [];
			}
			const since = new Date(sentAt).toISOString();
			return [
				{
					id: `${OUTLOOK_ID}:${sent.conversationId ?? sent.id}:waiting`,
					source: OUTLOOK_ID,
					reason: "no_reply",
					title: sent.subject?.trim() || "(no subject)",
					url: messageUrl(sent),
					since,
					label: `No reply for ${waitedFor(since, now)}`,
					context:
						recipients.length > 0
							? `To ${recipients.map((r) => r.name).join(", ")}`
							: undefined,
					detailRef: sent.id,
				},
			];
		})
		.sort((a, b) => Date.parse(a.since) - Date.parse(b.since));
}
