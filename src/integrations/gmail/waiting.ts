import {
	DEFAULT_WAITING_RULES,
	type WaitingItem,
	type WaitingRules,
	waitedFor,
} from "#/core/waiting";
import type { GmailThread } from "./api/schemas";
import { gmailThreadUrl } from "./mapper";
import { parseAddressList } from "./message";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure: conversations where your message is still the last one after
 * `noReplyAfterDays` → waiting items, oldest first.
 */
export function unansweredToWaiting(
	threads: readonly GmailThread[],
	accountEmail: string | undefined,
	now: Date,
	rules: WaitingRules = DEFAULT_WAITING_RULES,
): WaitingItem[] {
	return threads
		.flatMap((thread): WaitingItem[] => {
			const last = thread.messages.at(-1);
			if (!last?.labelIds.includes("SENT")) return [];
			const sentAt = Number(last.internalDate);
			if (now.getTime() - sentAt < rules.noReplyAfterDays * DAY_MS) {
				return [];
			}
			const header = (name: string) =>
				last.payload.headers.find(
					(h) => h.name.toLowerCase() === name.toLowerCase(),
				)?.value;
			const recipients = parseAddressList(header("To"));
			// A note to yourself isn't waiting on anybody.
			if (
				accountEmail &&
				recipients.length > 0 &&
				recipients.every(
					(r) => r.email.toLowerCase() === accountEmail.toLowerCase(),
				)
			) {
				return [];
			}
			const since = new Date(sentAt).toISOString();
			return [
				{
					id: `gmail:${thread.id}:waiting`,
					source: "gmail",
					reason: "no_reply",
					title: header("Subject")?.trim() || "(no subject)",
					url: gmailThreadUrl(thread.id, accountEmail),
					since,
					label: `No reply for ${waitedFor(since, now)}`,
					context:
						recipients.length > 0
							? `To ${recipients.map((r) => r.name).join(", ")}`
							: undefined,
					detailRef: last.id,
				},
			];
		})
		.sort((a, b) => Date.parse(a.since) - Date.parse(b.since));
}
