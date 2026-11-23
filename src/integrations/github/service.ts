import "@tanstack/react-start/server-only";
import { sortByUpdatedDesc, type WorkItem } from "#/core/work-item";
import type { WorkScope } from "#/core/work-scope";
import type { GitHubApi } from "./api/client";
import { GITHUB_QUERIES } from "./constants";
import { toWorkItem } from "./mapper";

/** Use-cases on top of the raw API. Takes the API as a dependency for tests. */
export function createGitHubService(api: GitHubApi) {
	const searchPrs = async (q: string): Promise<WorkItem[]> => {
		const res = await api.searchIssues(q);
		return res.items.map((item) => toWorkItem(item, "pull_request"));
	};

	return {
		async reviewRequests(): Promise<WorkItem[]> {
			const res = await api.searchIssues(GITHUB_QUERIES.reviewRequests);
			return res.items.map((item) => toWorkItem(item, "review_request"));
		},

		/** Open PRs you're involved in; "all" = opened by OR assigned to you. */
		async myPullRequests(scope: WorkScope): Promise<WorkItem[]> {
			if (scope === "created") return searchPrs(GITHUB_QUERIES.authored);
			if (scope === "assigned") return searchPrs(GITHUB_QUERIES.assigned);

			const [authored, assigned] = await Promise.all([
				searchPrs(GITHUB_QUERIES.authored),
				searchPrs(GITHUB_QUERIES.assigned),
			]);
			const unique = new Map(
				[...authored, ...assigned].map((item) => [item.id, item]),
			);
			return sortByUpdatedDesc([...unique.values()]);
		},
	};
}
