export const GITHUB_ID = "github";

/** security_events: Dependabot alerts on private repos (added later: reconnect). */
export const GITHUB_SCOPES = ["repo", "read:user", "security_events"];

/** Repos checked for Dependabot alerts (one request each, cached 10 min). */
export const DEPENDABOT_REPO_LIMIT = 50;

/** Results per search request: lists are capped at this size. */
export const SEARCH_PAGE_SIZE = 30;

const OPEN_PRS = "is:open is:pr archived:false";
/** Your own PRs that are ready (drafts are expected to be unfinished). */
const MY_READY_PRS = `${OPEN_PRS} author:@me draft:false`;

/** Max repos whose releases are fetched (one API call each). */
export const RELEASE_REPO_LIMIT = 10;

/** PRs you were involved in since `date` (YYYY-MM-DD): used to detect your repos. */
export const involvedPrsSince = (date: string) =>
	`is:pr involves:@me updated:>=${date}`;

export const GITHUB_QUERIES = {
	reviewRequests: `${OPEN_PRS} review-requested:@me`,
	/** PRs you opened ("Created by me"). */
	authored: `${OPEN_PRS} author:@me`,
	/** PRs assigned to you ("Assigned to me"). */
	assigned: `${OPEN_PRS} assignee:@me`,
	/** Your PRs where a reviewer requested changes. */
	changesRequested: `${MY_READY_PRS} review:changes_requested`,
	/** Your PRs whose latest commit has failing checks or statuses. */
	checksFailing: `${MY_READY_PRS} status:failure`,
	/** Your ready PRs nobody has reviewed yet. */
	awaitingReview: `${MY_READY_PRS} review:none`,
} as const;
