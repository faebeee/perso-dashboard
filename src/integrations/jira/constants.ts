export const JIRA_ID = "jira";

export const JIRA_SCOPES = [
	"read:jira-work",
	"read:jira-user",
	"offline_access",
];

/** Results per search request: lists are capped at this size. */
export const SEARCH_PAGE_SIZE = 30;

/** Workflow statuses shown by the "On Release" widget. Must match Jira exactly. */
export const JIRA_RELEASE_STATUSES = ["On Release", "Bereit für Release"];

/** Max projects whose versions are fetched (one API call each). */
export const RELEASE_PROJECT_LIMIT = 10;

/** Issues you're involved in, updated since `date` (YYYY-MM-DD): used to detect your projects. */
export const involvedIssuesSince = (date: string) =>
	`(assignee = currentUser() OR reporter = currentUser()) AND updated >= "${date}" ORDER BY updated DESC`;

/** Base filters, one per widget. Combined with a scope clause by `buildJql`. */
export const JIRA_FILTERS = {
	open: "statusCategory != Done",
	onRelease: `status IN (${JIRA_RELEASE_STATUSES.map((s) => `"${s}"`).join(", ")})`,
} as const;

export const JIRA_SCOPE_CLAUSES = {
	assigned: "assignee = currentUser()",
	created: "reporter = currentUser()",
	/** "Mine" = assigned to me or reported by me. */
	mine: "(assignee = currentUser() OR reporter = currentUser())",
} as const;

/**
 * Open issues assigned to me that are due today or earlier, oldest due date
 * first. Searched separately from "my issues" (most recently *updated*
 * first) so old, untouched overdue issues are never cut off by the page size.
 */
export const JIRA_DUE_ASSIGNED_JQL = `${JIRA_FILTERS.open} AND ${JIRA_SCOPE_CLAUSES.assigned} AND duedate <= endOfDay() ORDER BY duedate ASC`;

/** Issues you reported that are open and still unassigned, oldest first. */
export const JIRA_UNASSIGNED_REPORTED_JQL = `${JIRA_FILTERS.open} AND reporter = currentUser() AND assignee is EMPTY ORDER BY created ASC`;

export function buildJql(...clauses: (string | undefined)[]): string {
	return `${clauses.filter(Boolean).join(" AND ")} ORDER BY updated DESC`;
}
