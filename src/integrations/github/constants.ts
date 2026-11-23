export const GITHUB_ID = "github";

export const GITHUB_SCOPES = ["repo", "read:user"];

const OPEN_PRS = "is:open is:pr archived:false";

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
} as const;
