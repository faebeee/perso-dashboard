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
		"production_error",
		"security_alert",
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
	/**
	 * Opaque reference the source's in-app detail view understands (Jira issue
	 * key, Gmail message id…). Absent = the item only opens in the browser.
	 */
	detailRef: z.string().optional(),
	/** Repository or project it belongs to (filters, grouping). */
	project: z.string().optional(),
	/** Primary action, e.g. joining a video call. */
	action: z.object({ label: z.string(), url: z.string() }).optional(),
});

export type AttentionItem = z.infer<typeof attentionItemSchema>;
export type AttentionReason = AttentionItem["reason"];

const priorityList = z.array(z.string().trim().toLowerCase().min(1));

/**
 * What counts as urgent. Editable in Preferences; integrations receive the
 * current values with each request (see `rulesOf`).
 */
export const attentionRulesSchema = z.object({
	/** A meeting this close (or ongoing) is "right now". */
	meetingNowMinutes: z.number().int().min(1).max(120).default(15),
	/** Meetings starting within this window show up at all. */
	meetingSoonMinutes: z
		.number()
		.int()
		.min(5)
		.max(24 * 60)
		.default(120),
	/** Unanswered invitations for events within this window show up (calendars look 7 days ahead). */
	invitationWindowHours: z
		.number()
		.int()
		.min(1)
		.max(7 * 24)
		.default(48),
	/** Review requests older than this move from "soon" to "today". */
	reviewStaleHours: z
		.number()
		.int()
		.min(1)
		.max(30 * 24)
		.default(24),
	/** Important unread mail younger than this shows up. */
	emailWindowDays: z.number().int().min(1).max(30).default(2),
	/** Lower-cased Jira priority names: critical → "today", high → "soon". */
	criticalPriorities: priorityList.default(["highest", "blocker", "critical"]),
	highPriorities: priorityList.default(["high"]),
});

export type AttentionRules = z.infer<typeof attentionRulesSchema>;

export const DEFAULT_ATTENTION_RULES: AttentionRules =
	attentionRulesSchema.parse({});

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
