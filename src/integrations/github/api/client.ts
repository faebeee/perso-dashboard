import { TTL, ttlByPath } from "#/platform/cache-ttl";
import { createHttpClient, type FetchFn } from "#/platform/http";
import { GITHUB_ID, SEARCH_PAGE_SIZE } from "../constants";
import {
	githubCheckRunsSchema,
	githubCombinedStatusSchema,
	githubCommitSchema,
	githubCompareSchema,
	githubEventListSchema,
	githubPullFileListSchema,
	githubPullSchema,
	githubReleaseListSchema,
	githubReviewListSchema,
	githubSearchResponseSchema,
	githubUserSchema,
} from "./schemas";

/** Thin, typed wrapper over the GitHub REST API. No mapping, no policy. */
/** "acme/web" → "/repos/acme/web" (each part encoded). */
const repoPath = (repoFullName: string) => {
	const [owner = "", repo = ""] = repoFullName.split("/");
	return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
};

export function createGitHubApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: GITHUB_ID,
		baseUrl: "https://api.github.com",
		accessToken,
		headers: { "X-GitHub-Api-Version": "2022-11-28" },
		fetch,
		ttl: ttlByPath(
			[
				[/^\/user$/, TTL.stable],
				// A commit never changes once pushed.
				[/\/compare\/|\/commits\/[0-9a-f]{7,}$/, TTL.stable],
				[/\/releases$/, TTL.slow],
			],
			TTL.list,
		),
		// Search has its own, much smaller limit (30/min) than the core API.
		rateLimitBucket: (url) =>
			url.pathname.startsWith("/search/") ? "search" : "core",
	});

	return {
		viewer: () => http.get("/user", githubUserSchema),

		searchIssues: (q: string, perPage = SEARCH_PAGE_SIZE) =>
			http.get("/search/issues", githubSearchResponseSchema, {
				q,
				sort: "updated",
				order: "desc",
				per_page: perPage,
			}),

		/** Your recent activity (all repos and branches, incl. private ones). */
		userEvents: (login: string, page = 1) =>
			http.get(
				`/users/${encodeURIComponent(login)}/events`,
				githubEventListSchema,
				{ per_page: 100, page },
			),

		/** Commits between two SHAs (what a push added). */
		compare: (repoFullName: string, base: string, head: string) =>
			http.get(
				`${repoPath(repoFullName)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
				githubCompareSchema,
			),

		commit: (repoFullName: string, sha: string) =>
			http.get(
				`${repoPath(repoFullName)}/commits/${encodeURIComponent(sha)}`,
				githubCommitSchema,
			),

		/** One PR with its description rendered to HTML. */
		pull: (repoFullName: string, number: number) =>
			http.get(
				`${repoPath(repoFullName)}/pulls/${number}`,
				githubPullSchema,
				undefined,
				{ headers: { Accept: "application/vnd.github.full+json" } },
			),

		reviews: (repoFullName: string, number: number) =>
			http.get(
				`${repoPath(repoFullName)}/pulls/${number}/reviews`,
				githubReviewListSchema,
				{ per_page: 100 },
			),

		files: (repoFullName: string, number: number) =>
			http.get(
				`${repoPath(repoFullName)}/pulls/${number}/files`,
				githubPullFileListSchema,
				{ per_page: 100 },
			),

		/** GitHub Actions and other check-run based CI. */
		checkRuns: (repoFullName: string, sha: string) =>
			http.get(
				`${repoPath(repoFullName)}/commits/${encodeURIComponent(sha)}/check-runs`,
				githubCheckRunsSchema,
				{ per_page: 100 },
			),

		/** Classic commit statuses (older CI integrations). */
		combinedStatus: (repoFullName: string, sha: string) =>
			http.get(
				`${repoPath(repoFullName)}/commits/${encodeURIComponent(sha)}/status`,
				githubCombinedStatusSchema,
			),

		/** Newest first. Drafts are only visible with push access. */
		listReleases: (repoFullName: string, perPage = 10) => {
			const [owner = "", repo = ""] = repoFullName.split("/");
			return http.get(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
				githubReleaseListSchema,
				{ per_page: perPage },
			);
		},
	};
}

export type GitHubApi = ReturnType<typeof createGitHubApi>;
