import type { AttentionReason } from "@dashboard/core/attention";
import type { ItemKind } from "#/components/source-kit/item-icon";

/** Which icon each reason gets: an overdue Jira task is an issue, etc. */
export const KIND_FOR_REASON: Record<AttentionReason, ItemKind> = {
	review_requested: "review_request",
	changes_requested: "pull_request",
	checks_failing: "pull_request",
	invitation: "invitation",
	meeting: "meeting",
	high_priority: "issue",
	overdue: "issue",
	due_today: "issue",
	overdue_release: "release",
	important_email: "email",
	production_error: "error",
	security_alert: "security_alert",
};
