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

/** Pushes expanded per refresh: each needs a compare call (cached for a day). */
export const PUSH_LIMIT = 25;
/** Events pages read (100 each); GitHub keeps 90 days / 300 events. */
const EVENT_PAGES = 3;

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

/** Pure: newest first, each commit once (first branch it was seen on wins). */
export function mergeCommits(lists: readonly CommitInfo[][]): CommitInfo[] {
	const bySha = new Map<string, CommitInfo>();
	for (const commit of lists.flat()) {
		if (!bySha.has(commit.sha)) bySha.set(commit.sha, commit);
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
			const oldest = events.at(-1);
			if (
				events.length < 100 ||
				!oldest ||
				Date.parse(oldest.created_at) < since.getTime()
			) {
				break;
			}
		}
		return found;
	}

	async function expand(push: PushInfo, login: string): Promise<CommitInfo[]> {
		// Old payloads still list their commits (pushed by you).
		if (push.commits && push.commits.length > 0) {
			return push.commits.map((c) => toCommit(push, c.sha, c.message, push.at));
		}
		if (isZeroSha(push.head)) return []; // branch deleted
		// A new branch has no "before": take its head commit.
		const fetched = isZeroSha(push.before)
			? [await api.commit(push.repo, push.head)]
			: (await api.compare(push.repo, push.before, push.head)).commits;
		return commitsOfPush(push, fetched, login);
	}

	return {
		/** Commits you pushed in [since, until). */
		async recent(
			login: string,
			since: Date,
			until: Date = new Date(),
		): Promise<CommitInfo[]> {
			const recentPushes = (await pushes(login, since)).slice(0, PUSH_LIMIT);
			// A deleted repo or force-pushed history fails alone.
			const lists = await settleLeniently(
				recentPushes.map((p) => expand(p, login)),
			).catch(() => []);
			return mergeCommits(lists).filter(
				(c) => Date.parse(c.pushedAt) < until.getTime(),
			);
		},
	};
}
