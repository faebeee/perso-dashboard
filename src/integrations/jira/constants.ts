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

export function buildJql(...clauses: (string | undefined)[]): string {
	return `${clauses.filter(Boolean).join(" AND ")} ORDER BY updated DESC`;
}
