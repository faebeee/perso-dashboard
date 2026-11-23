import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { createGitHubApi } from "./api/client";
import type { GitHubCommit, GitHubEventList } from "./api/schemas";
import {
	commitsOfPush,
	createGitHubCommitService,
	mergeCommits,
	pushesSince,
} from "./commits";

const event = (
	id: string,
	created: string,
	payload: Record<string, unknown>,
	type = "PushEvent",
	repo = "acme/web",
): GitHubEventList[number] => ({
	id,
	type,
	created_at: created,
	repo: { name: repo },
	payload,
});

const commit = (
	sha: string,
	login: string | null,
	date: string,
	message = `msg ${sha}\n\nbody`,
): GitHubCommit => ({
	sha,
	html_url: `https://github.com/acme/web/commit/${sha}`,
	commit: { message, author: { date } },
	author: login ? { login } : null,
});

describe("pushesSince", () => {
	it("keeps branch pushes since a date, skipping tags and other events", () => {
		const pushes = pushesSince(
			[
				event("1", "2026-01-14T10:00:00Z", {
					ref: "refs/heads/feature/cart",
					head: "b",
					before: "a",
				}),
				event("2", "2026-01-14T09:00:00Z", {
					ref: "refs/tags/v1",
					head: "t",
					before: "0",
				}),
				event("3", "2026-01-14T08:00:00Z", {}, "IssuesEvent"),
				event("4", "2026-01-01T08:00:00Z", {
					ref: "refs/heads/main",
					head: "y",
					before: "x",
				}),
			],
			new Date("2026-01-10T00:00:00Z"),
		);
		expect(pushes.map((p) => [p.branch, p.before, p.head])).toEqual([
			["feature/cart", "a", "b"],
		]);
	});
});

describe("commitsOfPush", () => {
	it("keeps your commits (and unlinked ones), not merged-in commits of others", () => {
		const push = {
			repo: "acme/web",
			branch: "feature/cart",
			before: "a",
			head: "c",
			at: "2026-01-14T10:00:00Z",
		};
		const commits = commitsOfPush(
			push,
			[
				commit("c1", "Ada", "2026-01-14T09:00:00Z"),
				commit("c2", "bob", "2026-01-13T09:00:00Z"),
				commit("c3", null, "2026-01-14T09:30:00Z"),
			],
			"ada",
		);
		expect(
			commits.map((c) => [c.sha, c.message, c.branch, c.pushedAt]),
		).toEqual([
			["c1", "msg c1", "feature/cart", "2026-01-14T10:00:00.000Z"],
			["c3", "msg c3", "feature/cart", "2026-01-14T10:00:00.000Z"],
		]);
	});
});

describe("mergeCommits", () => {
	it("dedupes by sha and sorts newest first", () => {
		const c = (sha: string, at: string, branch = "main") => ({
			sha,
			shortSha: sha,
			message: sha,
			repo: "r",
			branch,
			at,
			pushedAt: at,
			url: "#",
		});
		expect(
			mergeCommits([
				[c("a", "2026-01-01T00:00:00Z", "feature")],
				[
					c("a", "2026-01-01T00:00:00Z", "main"),
					c("b", "2026-01-02T00:00:00Z"),
				],
			]).map((x) => [x.sha, x.branch]),
		).toEqual([
			["b", "main"],
			["a", "feature"],
		]);
	});
});

describe("commit service", () => {
	it("expands pushes with compare, new branches with their head commit", async () => {
		const fetch = fakeFetch({
			"/users/ada/events": [
				event("1", "2026-01-14T10:00:00Z", {
					ref: "refs/heads/feature/cart",
					head: "h1",
					before: "b1",
				}),
				event("2", "2026-01-14T09:00:00Z", {
					ref: "refs/heads/spike",
					head: "h2",
					before: "0000000000000000000000000000000000000000",
				}),
			],
			"/repos/acme/web/compare/b1...h1": {
				commits: [commit("c1", "ada", "2026-01-14T09:50:00Z")],
			},
			"/repos/acme/web/commits/h2": commit("h2", "ada", "2026-01-14T08:59:00Z"),
		});
		const commits = await createGitHubCommitService(
			createGitHubApi("t", fetch),
		).recent(
			"ada",
			new Date("2026-01-14T00:00:00Z"),
			new Date("2026-01-15T00:00:00Z"),
		);
		expect(commits.map((c) => [c.sha, c.branch])).toEqual([
			["c1", "feature/cart"],
			["h2", "spike"],
		]);
	});
});

describe("groupCommits", () => {
	it("groups by repo and branch, busiest first", async () => {
		const { groupCommits } = await import("./recent-commits");
		const c = (sha: string, repo: string, branch: string) => ({
			sha,
			shortSha: sha,
			message: sha,
			repo,
			branch,
			at: "2026-01-14T10:00:00Z",
			pushedAt: "2026-01-14T10:00:00Z",
			url: "#",
		});
		expect(
			groupCommits([
				c("1", "a/web", "main"),
				c("2", "a/api", "fix"),
				c("3", "a/api", "fix"),
			]).map((g) => [g.repo, g.branch, g.commits.length]),
		).toEqual([
			["a/api", "fix", 2],
			["a/web", "main", 1],
		]);
	});
});
