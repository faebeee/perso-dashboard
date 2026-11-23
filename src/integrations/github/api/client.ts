import { TTL, ttlByPath } from "#/platform/cache-ttl";
import { createHttpClient, type FetchFn } from "#/platform/http";
import { GITHUB_ID, SEARCH_PAGE_SIZE } from "../constants";
import {
	githubReleaseListSchema,
	githubSearchResponseSchema,
	githubUserSchema,
} from "./schemas";

/** Thin, typed wrapper over the GitHub REST API. No mapping, no policy. */
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
