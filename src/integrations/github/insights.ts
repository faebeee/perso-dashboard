import {
	type ActivityItem,
	countPerWeek,
	daysBetween,
	type MetricSeries,
	medianPerWeek,
	type WeekRange,
} from "#/core/insights";
import type { GitHubSearchItem } from "./api/schemas";
import type { CommitInfo } from "./commits";
import { GITHUB_ID } from "./constants";
import { prDetailRef } from "./detail";
import { repoFullName } from "./mapper";

/** Search results per page for insights (GitHub's maximum). */
export const INSIGHTS_PAGE_SIZE = 100;

/** "2026-01-05", widened by a day: search qualifiers use UTC days. */
const utcDay = (date: Date, shiftDays = 0) =>
	new Date(date.getTime() + shiftDays * 86_400_000).toISOString().slice(0, 10);

export const insightQueries = {
	merged: (from: Date, to: Date) =>
		`is:pr author:@me is:merged merged:${utcDay(from, -1)}..${utcDay(to, 1)}`,
	opened: (from: Date, to: Date) =>
		`is:pr author:@me created:${utcDay(from, -1)}..${utcDay(to, 1)}`,
	reviewed: (from: Date, to: Date) =>
		`is:pr reviewed-by:@me -author:@me updated:${utcDay(from, -1)}..${utcDay(to, 1)}`,
};

const within = (iso: string | null | undefined, from: Date, to: Date) => {
	if (!iso) return false;
	const t = Date.parse(iso);
	return t >= from.getTime() && t < to.getTime();
};

const context = (pr: GitHubSearchItem) =>
	`${repoFullName(pr.repository_url)} #${pr.number}`;

/** Pure: PR searches → activity in [from, to). Reviews use the PR's last activity. */
export function prActivity(
	found: {
		merged: readonly GitHubSearchItem[];
		opened: readonly GitHubSearchItem[];
		reviewed: readonly GitHubSearchItem[];
	},
	from: Date,
	to: Date,
): ActivityItem[] {
	const item = (
		pr: GitHubSearchItem,
		kind: ActivityItem["kind"],
		at: string,
	): ActivityItem => ({
		id: `${GITHUB_ID}:${kind}:${pr.id}`,
		source: GITHUB_ID,
		kind,
		title: pr.title,
		url: pr.html_url,
		at: new Date(at).toISOString(),
		context: context(pr),
		detailRef: prDetailRef(repoFullName(pr.repository_url), pr.number),
	});
	return [
		...found.merged
			.filter((pr) => within(pr.pull_request?.merged_at, from, to))
			.map((pr) =>
				item(pr, "pr_merged", pr.pull_request?.merged_at ?? pr.updated_at),
			),
		...found.opened
			.filter((pr) => within(pr.created_at, from, to))
			.map((pr) => item(pr, "pr_opened", pr.created_at ?? pr.updated_at)),
		...found.reviewed
			.filter((pr) => within(pr.updated_at, from, to))
			.map((pr) => item(pr, "pr_reviewed", pr.updated_at)),
	];
}

/** Pure: commits → activity ("repo (branch)" as context, for grouping). */
export function commitActivity(commits: readonly CommitInfo[]): ActivityItem[] {
	return commits.map((c) => ({
		id: `${GITHUB_ID}:commit:${c.sha}`,
		source: GITHUB_ID,
		kind: "commit",
		title: c.message,
		url: c.url,
		at: c.at,
		context: `${c.repo} (${c.branch})`,
	}));
}

/** Pure: weekly PR metrics. */
export function prMetrics(
	found: {
		merged: readonly GitHubSearchItem[];
		reviewed: readonly GitHubSearchItem[];
	},
	weeks: readonly WeekRange[],
): MetricSeries[] {
	const merged = found.merged.flatMap((pr) => {
		const mergedAt = pr.pull_request?.merged_at;
		return mergedAt ? [{ pr, mergedAt: new Date(mergedAt) }] : [];
	});
	return [
		{
			id: "github.prs-merged",
			source: GITHUB_ID,
			label: "PRs merged",
			unit: "count",
			description: "Your pull requests merged each week.",
			values: countPerWeek(
				merged.map((m) => m.mergedAt),
				weeks,
			),
		},
		{
			id: "github.cycle-time",
			source: GITHUB_ID,
			label: "PR cycle time",
			unit: "days",
			description:
				"Median days from opening to merge, for PRs merged that week.",
			values: medianPerWeek(
				merged
					.filter((m) => m.pr.created_at)
					.map((m) => ({
						at: m.mergedAt,
						value: daysBetween(new Date(m.pr.created_at ?? ""), m.mergedAt),
					})),
				weeks,
			),
		},
		{
			id: "github.prs-reviewed",
			source: GITHUB_ID,
			label: "PRs reviewed",
			unit: "count",
			description:
				"Others' PRs you reviewed, counted in the week of their last activity.",
			approximate: true,
			values: countPerWeek(
				found.reviewed.map((pr) => new Date(pr.updated_at)),
				weeks,
			),
		},
	];
}
