import { z } from "zod";

/** Something you're waiting on other people for. */
export const waitingItemSchema = z.object({
	/** Globally unique: `${source}:${nativeId}` */
	id: z.string(),
	source: z.string(),
	reason: z.enum([
		/** Your PR has no review yet. */
		"awaiting_review",
		/** An issue you reported that nobody picked up. */
		"unassigned",
		/** Your meeting has invitees who haven't replied. */
		"invitation_replies",
		/** You wrote last in a conversation and got no answer. */
		"no_reply",
	]),
	title: z.string(),
	url: z.string(),
	/** ISO: since when you've been waiting (or the event start); oldest first. */
	since: z.string(),
	/** "Waiting 3 days for review", "2 of 5 haven't replied"… */
	label: z.string(),
	context: z.string().optional(),
	detailRef: z.string().optional(),
});

export type WaitingItem = z.infer<typeof waitingItemSchema>;
export type WaitingReason = WaitingItem["reason"];

/** Thresholds shared by every integration's rules. */
export const WAITING_RULES = {
	/** A sent email counts as unanswered after this long. */
	noReplyAfterDays: 2,
	/** How far back sent emails are checked. */
	noReplyWindowDays: 14,
	/** Meetings you organize, this far ahead, are checked for replies. */
	invitationWindowDays: 7,
	/** Meeting prep: recent conversations with attendees, this far back. */
	relatedWindowDays: 14,
} as const;

/** "3 days", "5 hours", "under an hour". */
export function waitedFor(since: string, now: Date): string {
	const hours = Math.floor((now.getTime() - Date.parse(since)) / 3_600_000);
	if (hours < 1) return "under an hour";
	if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
	const days = Math.floor(hours / 24);
	return `${days} days`;
}
