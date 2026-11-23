import { z } from "zod";

/**
 * Something that needs the user's attention soon. Each integration decides
 * what qualifies (see `IntegrationBackend.getAttentionItems`); the urgent
 * view only ranks and renders them.
 */

export const urgencySchema = z.enum(["now", "today", "soon"]);
export type Urgency = z.infer<typeof urgencySchema>;

export const URGENCY_LABELS: Record<Urgency, string> = {
	now: "Right now",
	today: "Today",
	soon: "When you can",
};

export const attentionItemSchema = z.object({
	/** Globally unique: `${source}:${nativeId}` */
	id: z.string(),
	source: z.string(),
	reason: z.enum([
		"review_requested",
		"changes_requested",
		"checks_failing",
		"invitation",
		"high_priority",
		"overdue",
		"due_today",
		"overdue_release",
		"important_email",
		"meeting",
	]),
	urgency: urgencySchema,
	title: z.string(),
	url: z.string(),
	/** ISO timestamp that orders items within an urgency group (earliest first). */
	at: z.string(),
	/** Short badge text: "Starts in 12 min", "Waiting 2 days", "Due today"… */
	label: z.string(),
	context: z.string().optional(),
	actor: z
		.object({ name: z.string(), avatarUrl: z.string().optional() })
		.optional(),
	/** Primary action, e.g. joining a video call. */
	action: z.object({ label: z.string(), url: z.string() }).optional(),
});

export type AttentionItem = z.infer<typeof attentionItemSchema>;
export type AttentionReason = AttentionItem["reason"];

/** Thresholds shared by every integration's rules. */
export const ATTENTION_RULES = {
	/** A meeting this close (or ongoing) is "now". */
	meetingNowMinutes: 15,
	/** Meetings starting within this window show up at all. */
	meetingSoonMinutes: 120,
	/** Unanswered invitations for events within this window show up. */
	invitationWindowHours: 48,
	/** Review requests older than this are "today" instead of "soon". */
	reviewStaleHours: 24,
	/** Important unread mail younger than this shows up. */
	emailWindowDays: 2,
	/** Lower-cased Jira priority names treated as urgent ("high" → soon). */
	criticalPriorities: ["highest", "blocker", "critical"],
	highPriorities: ["high"],
} as const;

const URGENCY_ORDER: Record<Urgency, number> = { now: 0, today: 1, soon: 2 };

/** Most urgent first; within a group, earliest `at` first. */
export function rankAttention(
	items: readonly AttentionItem[],
): AttentionItem[] {
	return [...items].sort(
		(a, b) =>
			URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
			Date.parse(a.at) - Date.parse(b.at),
	);
}
