import {
	type Release,
	type ReleaseQuery,
	releaseDateMs,
} from "@dashboard/core/release";
import { settleLeniently } from "#/lib/collect-sources";
import type { GitHubApi } from "./api/client";
import { involvedPrsSince, RELEASE_REPO_LIMIT } from "./constants";
import { repoFullName, toRelease } from "./mapper";

/**
 * Releases from the repos you've recently worked in. Repos are detected from
 * PRs you were involved in during the release window.
 */
export function createGitHubReleaseService(api: GitHubApi) {
	async function activeRepos(since: Date): Promise<string[]> {
		const day = since.toISOString().slice(0, 10);
		const res = await api.searchIssues(involvedPrsSince(day), 100);
		const repos = new Set(res.items.map((i) => repoFullName(i.repository_url)));
		return [...repos].slice(0, RELEASE_REPO_LIMIT);
	}

	return {
		async releases({ releasedSince }: ReleaseQuery): Promise<Release[]> {
			const repos = await activeRepos(releasedSince);
			const perRepo = await settleLeniently(
				repos.map(async (repo) =>
					(await api.listReleases(repo)).map((r) => toRelease(r, repo)),
				),
			);
			return perRepo
				.flat()
				.filter(
					(r) =>
						r.state === "upcoming" ||
						(r.date !== undefined &&
							releaseDateMs(r.date) >= releasedSince.getTime()),
				);
		},
	};
}
