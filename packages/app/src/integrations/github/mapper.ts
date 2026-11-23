import type { Release } from "@dashboard/core/release";
import { makeWorkItemId, type WorkItem } from "@dashboard/core/work-item";
import type { GitHubRelease, GitHubSearchItem } from "./api/schemas";
import { GITHUB_ID } from "./constants";
import { prDetailRef } from "./detail";

export type GitHubPrKind = Extract<
	WorkItem["kind"],
	"pull_request" | "assigned_pull_request" | "review_request"
>;

/**
 * Stable id for a PR in "my PRs" lists. Authored and assigned PRs share it,
 * so a PR that's both collapses into one item; review requests stay apart.
 */
export const pullRequestItemId = (nativeId: number) =>
	makeWorkItemId(GITHUB_ID, `pull_request:${nativeId}`);

/** Pure: GitHub search item → WorkItem. */
export function toWorkItem(
	item: GitHubSearchItem,
	kind: GitHubPrKind,
): WorkItem {
	const repo = repoFullName(item.repository_url);
	return {
		id:
			kind === "review_request"
				? makeWorkItemId(GITHUB_ID, `review_request:${item.id}`)
				: pullRequestItemId(item.id),
		source: GITHUB_ID,
		kind,
		title: item.title,
		url: item.html_url,
		updatedAt: item.updated_at,
		context: `${repo} #${item.number}`,
		project: repo,
		detailRef: prDetailRef(repo, item.number),
		status: item.draft ? "Draft" : undefined,
		actor: item.user
			? { name: item.user.login, avatarUrl: item.user.avatar_url }
			: undefined,
		tags: item.labels.map((label) => label.name),
	};
}

/** "https://api.github.com/repos/acme/web" → "acme/web" */
export function repoFullName(repositoryUrl: string): string {
	return repositoryUrl.split("/repos/")[1] ?? repositoryUrl;
}

/** Pure: GitHub release → Release. Drafts count as upcoming. */
export function toRelease(release: GitHubRelease, repo: string): Release {
	const tags = [
		release.draft ? "Draft" : undefined,
		release.prerelease ? "Pre-release" : undefined,
	].filter((tag): tag is string => Boolean(tag));
	return {
		id: makeWorkItemId(GITHUB_ID, `release:${release.id}`),
		source: GITHUB_ID,
		name: release.name?.trim() || release.tag_name,
		url: release.html_url,
		project: repo,
		state: release.draft ? "upcoming" : "released",
		date: release.draft
			? undefined
			: (release.published_at ?? release.created_at),
		tags,
	};
}
