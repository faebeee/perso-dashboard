import { settleLeniently } from "#/lib/collect-sources";
import type { GitHubApi } from "./api/client";
import {
	type GitHubCommit,
	type GitHubEventList,
	githubPushPayloadSchema,
} from "./api/schemas";

/** A commit you pushed, on any repo and branch. */
export interface CommitInfo {
	sha: string;
	shortSha: string;
	/** First line of the message. */
	message: string;
	repo: string;
	branch: string;
	/** ISO: when it was authored (or pushed, when unknown). */
	at: string;
	/** ISO: when you pushed it. Ranges filter on this (rebases keep old dates). */
	pushedAt: string;
	url: string;
}

export interface PushInfo {
	repo: string;
	branch: string;
	before: string;
	head: string;
	at: string;
	/** Only present in payloads from before Oct 2025. */
	commits?: { sha: string; message: string }[];
}

/**
 * Pushes expanded per refresh, newest first: each needs a compare call
 * (cached for a day, since a SHA range never changes).
 */
export const PUSH_LIMIT = 100;
/** Compare calls in flight at once (GitHub frowns on bursts). */
const CONCURRENCY = 6;
/** Events pages read (100 each); GitHub keeps 90 days / 300 events. */
const EVENT_PAGES = 3;

/** Starts `fn` for each item, at most `limit` at a time; one promise per item. */
function mapWithLimit<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R>[] {
	let running = 0;
	const queue: (() => void)[] = [];
	const next = () => {
		running--;
		queue.shift()?.();
	};
	return items.map(
		(item) =>
			new Promise<R>((resolve, reject) => {
				const start = () => {
					running++;
					fn(item).then(resolve, reject).finally(next);
				};
				if (running < limit) start();
				else queue.push(start);
			}),
	);
}

const firstLine = (message: string) => message.split("\n")[0]?.trim() ?? "";
const isZeroSha = (sha: string) => /^0+$/.test(sha);

/** Pure: branch pushes since `since`, newest first (tags are skipped). */
export function pushesSince(events: GitHubEventList, since: Date): PushInfo[] {
	return events.flatMap((event): PushInfo[] => {
		if (event.type !== "PushEvent") return [];
		if (Date.parse(event.created_at) < since.getTime()) return [];
		const payload = githubPushPayloadSchema.safeParse(event.payload);
		if (!payload.success || !payload.data.ref.startsWith("refs/heads/"))
			return [];
		const { ref, head, before, commits } = payload.data;
		return [
			{
				repo: event.repo.name,
				branch: ref.slice("refs/heads/".length),
				before,
				head,
				at: event.created_at,
				commits: commits
					?.filter((c) => c.distinct !== false)
					.map((c) => ({ sha: c.sha, message: c.message })),
			},
		];
	});
}

const toCommit = (
	push: PushInfo,
	sha: string,
	message: string,
	at: string,
	url?: string,
): CommitInfo => ({
	sha,
	shortSha: sha.slice(0, 7),
	message: firstLine(message),
	repo: push.repo,
	branch: push.branch,
	at: new Date(at).toISOString(),
	pushedAt: new Date(push.at).toISOString(),
	url: url ?? `https://github.com/${push.repo}/commit/${sha}`,
});

/**
 * Pure: the commits a push added that are *yours*. Pushes can carry other
 * people's commits (merging main into your branch); those are dropped.
 * Commits whose email isn't linked to any account are kept.
 */
export function commitsOfPush(
	push: PushInfo,
	fetched: readonly GitHubCommit[],
	login: string,
): CommitInfo[] {
	return fetched
		.filter(
			(c) => !c.author || c.author.login.toLowerCase() === login.toLowerCase(),
		)
		.map((c) =>
			toCommit(
				push,
				c.sha,
				c.commit.message,
				c.commit.author?.date ?? push.at,
				c.html_url,
			),
		);
}

/**
 * Pure: newest first, each commit once. A commit that reached several
 * branches (a feature branch merged into test or main) is shown on the
 * branch it was pushed to first: where the work was done.
 */
export function mergeCommits(lists: readonly CommitInfo[][]): CommitInfo[] {
	const bySha = new Map<string, CommitInfo>();
	for (const commit of lists.flat()) {
		const seen = bySha.get(commit.sha);
		if (!seen || Date.parse(commit.pushedAt) < Date.parse(seen.pushedAt)) {
			bySha.set(commit.sha, commit);
		}
	}
	return [...bySha.values()].sort(
		(a, b) => Date.parse(b.at) - Date.parse(a.at),
	);
}

/** Your commits since `since`, across all repos and branches you pushed to. */
export function createGitHubCommitService(api: GitHubApi) {
	async function pushes(login: string, since: Date): Promise<PushInfo[]> {
		const found: PushInfo[] = [];
		for (let page = 1; page <= EVENT_PAGES; page++) {
			const events = await api.userEvents(login, page);
			found.push(...pushesSince(events, since));
			// The feed isn't strictly ordered: look at the page's oldest event.
			const oldest = Math.min(...events.map((e) => Date.parse(e.created_at)));
			if (events.length < 100 || !(oldest >= since.getTime())) break;
		}
		return found;
	}

	async function expand(push: PushInfo, login: string): Promise<CommitInfo[]> {
		// Old payloads still list their commits (pushed by you).
		if (push.commits && push.commits.length > 0) {
			return push.commits.map((c) => toCommit(push, c.sha, c.message, push.at));
		}
		if (isZeroSha(push.head)) return []; // branch deleted
		const fetched = isZeroSha(push.before)
			? await newBranchCommits(push)
			: (await api.compare(push.repo, push.before, push.head)).commits;
		return commitsOfPush(push, fetched, login);
	}

	/**
	 * A new branch has no "before": its commits are the ones not on the
	 * default branch. Falls back to the head commit (e.g. a new repo).
	 */
	async function newBranchCommits(push: PushInfo): Promise<GitHubCommit[]> {
		try {
			const { default_branch } = await api.repo(push.repo);
			if (default_branch !== push.branch) {
				const { commits } = await api.compare(
					push.repo,
					default_branch,
					push.head,
				);
				if (commits.length > 0) return commits;
			}
		} catch {
			// Unrelated histories, no access to the repo: use the head commit.
		}
		return [await api.commit(push.repo, push.head)];
	}

	return {
		/** Commits you pushed in [since, until). */
		async recent(
			login: string,
			since: Date,
			until: Date = new Date(),
		): Promise<CommitInfo[]> {
			// Every branch counts; the newest pushes first when there are many.
			const recentPushes = (await pushes(login, since))
				.filter((p) => Date.parse(p.at) < until.getTime())
				.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
				.slice(0, PUSH_LIMIT);
			// A deleted repo or force-pushed history fails alone.
			const lists = await settleLeniently(
				mapWithLimit(recentPushes, CONCURRENCY, (p) => expand(p, login)),
			).catch(() => []);
			return mergeCommits(lists).filter(
				(c) => Date.parse(c.pushedAt) < until.getTime(),
			);
		},
	};
}
