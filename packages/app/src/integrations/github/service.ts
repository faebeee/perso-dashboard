import { sortByUpdatedDesc, type WorkItem } from "@dashboard/core/work-item";
import type { WorkScope } from "@dashboard/core/work-scope";
import type { GitHubApi } from "./api/client";
import { GITHUB_QUERIES } from "./constants";
import {
	type PullRequestDetail,
	parsePrDetailRef,
	toPullRequestDetail,
} from "./detail";
import { type GitHubPrKind, toWorkItem } from "./mapper";

/** Something on your own PR that's waiting on you. */
export type PrSignal = "changes_requested" | "checks_failing";

export const PR_SIGNAL_LABELS: Record<PrSignal, string> = {
	changes_requested: "Changes requested",
	checks_failing: "Checks failing",
};

export interface PrNeedingAction {
	item: WorkItem;
	signals: PrSignal[];
}

/** Use-cases on top of the raw API. Takes the API as a dependency for tests. */
export function createGitHubService(api: GitHubApi) {
	const searchPrs = async (
		q: string,
		kind: GitHubPrKind,
	): Promise<WorkItem[]> => {
		const res = await api.searchIssues(q);
		return res.items.map((item) => toWorkItem(item, kind));
	};

	/** Your ready PRs with changes requested and/or failing checks. */
	async function prsNeedingAction(): Promise<PrNeedingAction[]> {
		const [changes, failing] = await Promise.all([
			searchPrs(GITHUB_QUERIES.changesRequested, "pull_request"),
			searchPrs(GITHUB_QUERIES.checksFailing, "pull_request"),
		]);
		const byId = new Map<string, PrNeedingAction>();
		const add = (items: WorkItem[], signal: PrSignal) => {
			for (const item of items) {
				const entry = byId.get(item.id) ?? { item, signals: [] };
				entry.signals.push(signal);
				byId.set(item.id, entry);
			}
		};
		add(changes, "changes_requested");
		add(failing, "checks_failing");
		return [...byId.values()];
	}

	/** Shows what's waiting on you as the PR's status badge. */
	const withSignals = (items: WorkItem[], needing: PrNeedingAction[]) => {
		const signals = new Map(needing.map((n) => [n.item.id, n.signals]));
		return items.map((item) => {
			const found = signals.get(item.id);
			return found
				? {
						...item,
						status: found.map((s) => PR_SIGNAL_LABELS[s]).join(" · "),
					}
				: item;
		});
	};

	return {
		prsNeedingAction,

		/** Everything for the PR detail view (`detailRef` = "owner/repo#123"). */
		async pullRequestDetail(ref: string): Promise<PullRequestDetail> {
			const parsed = parsePrDetailRef(ref);
			if (!parsed) throw new Error(`Not a pull request reference: ${ref}`);
			const { repo, number } = parsed;
			const pull = await api.pull(repo, number);
			// CI can be hidden from OAuth apps on some repos: show what's there.
			const [reviews, files, checkRuns, statuses] = await Promise.all([
				api.reviews(repo, number),
				api.files(repo, number),
				api.checkRuns(repo, pull.head.sha).catch(() => ({ check_runs: [] })),
				api.combinedStatus(repo, pull.head.sha).catch(() => ({ statuses: [] })),
			]);
			return toPullRequestDetail({
				repo,
				pull,
				reviews,
				files,
				checkRuns,
				statuses,
			});
		},

		/** Raw (with created_at), for the Waiting page. */
		awaitingReview: async () =>
			(await api.searchIssues(GITHUB_QUERIES.awaitingReview)).items,

		async reviewRequests(): Promise<WorkItem[]> {
			return searchPrs(GITHUB_QUERIES.reviewRequests, "review_request");
		},

		/**
		 * Open PRs you're involved in; "all" = opened by OR assigned to you.
		 * PRs you opened carry their changes-requested / failing-checks status.
		 */
		async myPullRequests(scope: WorkScope): Promise<WorkItem[]> {
			if (scope === "assigned") {
				return searchPrs(GITHUB_QUERIES.assigned, "assigned_pull_request");
			}

			const [authored, assigned, needing] = await Promise.all([
				searchPrs(GITHUB_QUERIES.authored, "pull_request"),
				scope === "all"
					? searchPrs(GITHUB_QUERIES.assigned, "assigned_pull_request")
					: Promise.resolve([]),
				prsNeedingAction(),
			]);
			// Authored wins when a PR is both yours and assigned to you.
			const unique = new Map(
				[...assigned, ...withSignals(authored, needing)].map((item) => [
					item.id,
					item,
				]),
			);
			return sortByUpdatedDesc([...unique.values()]);
		},
	};
}
