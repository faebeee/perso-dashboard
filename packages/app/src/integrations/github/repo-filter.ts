import type { SettingOption } from "@dashboard/core/integration";
import type { GitHubApi } from "./api/client";
import type { GitHubRepoList } from "./api/schemas";
import { repoFullName } from "./mapper";

/**
 * Narrows a GitHub API to the repositories you chose (Preferences → GitHub).
 * Everything that lists across repos (search, your repos, your events) only
 * returns the chosen ones; single-repo calls (a PR, a commit) pass through,
 * since they're only reached from something already shown.
 *
 * An empty selection means "all repositories": the API is returned as is.
 */
export function withRepoFilter(
	api: GitHubApi,
	repos: readonly string[],
): GitHubApi {
	if (repos.length === 0) return api;
	const allowed = new Set(repos.map((r) => r.toLowerCase()));
	const keep = (fullName: string) => allowed.has(fullName.toLowerCase());

	return {
		...api,

		async searchIssues(q, perPage) {
			const res = await api.searchIssues(repoQuery(q, repos), perPage);
			// The query already narrows it; the filter guards against renames.
			const items = res.items.filter((item) =>
				keep(repoFullName(item.repository_url)),
			);
			return { ...res, items };
		},

		async userRepos(page) {
			return (await api.userRepos(page)).filter((r) => keep(r.full_name));
		},

		async userEvents(login, page) {
			return (await api.userEvents(login, page)).filter((e) =>
				keep(e.repo.name),
			);
		},
	};
}

/** Pure: adds `repo:` qualifiers (GitHub ORs them) to a search query. */
export function repoQuery(q: string, repos: readonly string[]): string {
	return [q, ...repos.map((r) => `repo:${r}`)].join(" ");
}

/** Pages of `/user/repos` read for the picker (100 repos each). */
const REPO_OPTION_PAGES = 10;

/** Every repository you can access, for choosing which ones to follow. */
export async function loadRepoOptions(
	api: GitHubApi,
): Promise<SettingOption[]> {
	const repos: GitHubRepoList = [];
	for (let page = 1; page <= REPO_OPTION_PAGES; page++) {
		const batch = await api.userRepos(page);
		repos.push(...batch);
		if (batch.length < 100) break;
	}
	return repoOptions(repos);
}

/** Pure: repo list → choices, alphabetical, archived ones last. */
export function repoOptions(repos: GitHubRepoList): SettingOption[] {
	return [...new Map(repos.map((r) => [r.full_name, r])).values()]
		.sort(
			(a, b) =>
				Number(a.archived) - Number(b.archived) ||
				a.full_name.localeCompare(b.full_name),
		)
		.map((r) => ({
			value: r.full_name,
			label: r.full_name,
			badge: r.archived ? "Archived" : r.private ? "Private" : undefined,
		}));
}
