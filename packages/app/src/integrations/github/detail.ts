import type {
	GitHubCheckRuns,
	GitHubCombinedStatus,
	GitHubPull,
	GitHubPullFileList,
	GitHubReviewList,
} from "./api/schemas";

/** detailRef of a PR: "owner/repo#123". */
export const prDetailRef = (repoFullName: string, number: number) =>
	`${repoFullName}#${number}`;

export function parsePrDetailRef(
	ref: string,
): { repo: string; number: number } | null {
	const match = /^([^/#\s]+\/[^/#\s]+)#(\d+)$/.exec(ref);
	return match ? { repo: match[1] ?? "", number: Number(match[2]) } : null;
}

export type ReviewVerdict =
	| "approved"
	| "changes_requested"
	| "commented"
	| "pending";

export type CheckState = "success" | "failure" | "pending" | "neutral";

export interface PullRequestDetail {
	repo: string;
	number: number;
	title: string;
	url: string;
	state: "open" | "draft" | "merged" | "closed";
	author: { name: string; avatarUrl?: string } | null;
	createdAt: string;
	updatedAt: string;
	branch: { head: string; base: string };
	/** Untrusted HTML rendered by GitHub. */
	bodyHtml?: string;
	additions: number;
	deletions: number;
	changedFiles: number;
	labels: string[];
	reviewers: {
		name: string;
		avatarUrl?: string;
		verdict: ReviewVerdict;
		at?: string;
	}[];
	checks: { name: string; state: CheckState; url?: string }[];
	files: {
		path: string;
		status: string;
		additions: number;
		deletions: number;
	}[];
}

const VERDICTS: Record<string, ReviewVerdict> = {
	APPROVED: "approved",
	CHANGES_REQUESTED: "changes_requested",
	COMMENTED: "commented",
};

/** Check-run conclusion / commit status → one of four states. */
function checkState(status: string, conclusion?: string | null): CheckState {
	if (status !== "completed") return "pending";
	switch (conclusion) {
		case "success":
			return "success";
		case "failure":
		case "timed_out":
		case "action_required":
		case "startup_failure":
			return "failure";
		default:
			return "neutral"; // skipped, cancelled, neutral, stale
	}
}

function statusState(state: string): CheckState {
	if (state === "success") return "success";
	if (state === "pending") return "pending";
	return "failure"; // failure, error
}

/**
 * Pure: GitHub's PR, reviews, files and CI → detail view model.
 * Each reviewer shows their latest verdict; a later comment doesn't undo an
 * approval or a change request. Requested reviewers without a review are
 * "pending".
 */
export function toPullRequestDetail(input: {
	repo: string;
	pull: GitHubPull;
	reviews: GitHubReviewList;
	files: GitHubPullFileList;
	checkRuns: GitHubCheckRuns;
	statuses: GitHubCombinedStatus;
}): PullRequestDetail {
	const { pull } = input;
	const reviewers = new Map<string, PullRequestDetail["reviewers"][number]>();
	for (const review of input.reviews) {
		const verdict = VERDICTS[review.state];
		if (!review.user || !verdict) continue; // PENDING (your own draft), DISMISSED
		const previous = reviewers.get(review.user.login);
		const keepPrevious =
			verdict === "commented" && previous && previous.verdict !== "commented";
		if (!keepPrevious) {
			reviewers.set(review.user.login, {
				name: review.user.login,
				avatarUrl: review.user.avatar_url,
				verdict,
				at: review.submitted_at ?? undefined,
			});
		}
	}
	for (const requested of pull.requested_reviewers) {
		// Re-requested reviewers are pending again, whatever they said before.
		reviewers.set(requested.login, {
			name: requested.login,
			avatarUrl: requested.avatar_url,
			verdict: "pending",
		});
	}
	for (const team of pull.requested_teams) {
		reviewers.set(`team:${team.name}`, {
			name: `@${team.name}`,
			verdict: "pending",
		});
	}

	return {
		repo: input.repo,
		number: pull.number,
		title: pull.title,
		url: pull.html_url,
		state: pull.merged_at
			? "merged"
			: pull.state === "closed"
				? "closed"
				: pull.draft
					? "draft"
					: "open",
		author: pull.user
			? { name: pull.user.login, avatarUrl: pull.user.avatar_url }
			: null,
		createdAt: pull.created_at,
		updatedAt: pull.updated_at,
		branch: { head: pull.head.ref, base: pull.base.ref },
		bodyHtml: pull.body_html?.trim() || undefined,
		additions: pull.additions,
		deletions: pull.deletions,
		changedFiles: pull.changed_files,
		labels: pull.labels.map((l) => l.name),
		reviewers: [...reviewers.values()],
		checks: [
			...input.checkRuns.check_runs.map((run) => ({
				name: run.name,
				state: checkState(run.status, run.conclusion),
				url: run.html_url ?? undefined,
			})),
			...input.statuses.statuses.map((s) => ({
				name: s.context,
				state: statusState(s.state),
				url: s.target_url ?? undefined,
			})),
		],
		files: input.files.map((f) => ({
			path: f.filename,
			status: f.status,
			additions: f.additions,
			deletions: f.deletions,
		})),
	};
}
