import { sortByUpdatedDesc, type WorkItem } from "#/core/work-item";
import type { WorkScope } from "#/core/work-scope";
import type { GitHubApi } from "./api/client";
import { GITHUB_QUERIES } from "./constants";
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
