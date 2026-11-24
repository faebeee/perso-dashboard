import { fakeFetch } from "@dashboard/platform/testing/fake-fetch";
import { describe, expect, it } from "vitest";
import { createGitHubApi } from "./api/client";
import type { GitHubCommit, GitHubEventList } from "./api/schemas";
import {
	commitsOfPush,
	createGitHubCommitService,
	mergeCommits,
	pushesFromActivity,
	pushesSince,
	reposPushedSince,
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

	it("lists every commit of a new branch, not just its head", async () => {
		const fetch = fakeFetch({
			"/users/ada/events": [
				event("1", "2026-01-14T10:00:00Z", {
					ref: "refs/heads/feature/new",
					head: "h1",
					before: "0000000000000000000000000000000000000000",
				}),
			],
			"/repos/acme/web": { default_branch: "main" },
			"/repos/acme/web/compare/main...h1": {
				commits: [
					commit("c1", "ada", "2026-01-14T09:00:00Z"),
					commit("h1", "ada", "2026-01-14T09:30:00Z"),
				],
			},
		});
		const commits = await createGitHubCommitService(
			createGitHubApi("t", fetch),
		).recent("ada", new Date("2026-01-14T00:00:00Z"));
		expect(commits.map((c) => [c.sha, c.branch])).toEqual([
			["h1", "feature/new"],
			["c1", "feature/new"],
		]);
	});

	it("shows merged work on the branch it was done on, whatever the feed order", async () => {
		const fetch = fakeFetch({
			// GitHub's feed isn't strictly ordered: the later merge comes first.
			"/users/ada/events": [
				event("2", "2026-01-14T11:00:00Z", {
					ref: "refs/heads/test",
					head: "m1",
					before: "t0",
				}),
				event("3", "2026-01-14T12:00:00Z", {
					ref: "refs/heads/main",
					head: "x1",
					before: "x0",
				}),
				event("1", "2026-01-14T10:00:00Z", {
					ref: "refs/heads/feature/cart",
					head: "c1",
					before: "f0",
				}),
			],
			"/repos/acme/web/compare/t0...m1": {
				commits: [
					commit("c1", "ada", "2026-01-14T09:50:00Z"),
					commit("m1", "ada", "2026-01-14T11:00:00Z"),
				],
			},
			"/repos/acme/web/compare/x0...x1": {
				commits: [commit("x1", "ada", "2026-01-14T11:30:00Z")],
			},
			"/repos/acme/web/compare/f0...c1": {
				commits: [commit("c1", "ada", "2026-01-14T09:50:00Z")],
			},
		});
		const commits = await createGitHubCommitService(
			createGitHubApi("t", fetch),
		).recent(
			"ada",
			new Date("2026-01-14T00:00:00Z"),
			new Date("2026-01-14T11:59:00Z"),
		);
		expect(commits.map((c) => [c.sha, c.branch])).toEqual([
			["m1", "test"],
			["c1", "feature/cart"],
		]);
	});
});

describe("pushesFromActivity", () => {
	it("keeps branch pushes since a date, skipping deletions and tags", () => {
		const activity = (
			type: string,
			ref: string,
			timestamp: string,
			after = "h",
		) => ({ activity_type: type, ref, before: "b", after, timestamp });
		const pushes = pushesFromActivity(
			"acme/web",
			[
				activity("push", "refs/heads/feature/a", "2026-01-14T10:00:00Z", "h1"),
				activity("force_push", "refs/heads/feature/b", "2026-01-14T09:00:00Z"),
				activity("branch_deletion", "refs/heads/old", "2026-01-14T09:00:00Z"),
				activity("push", "refs/tags/v1", "2026-01-14T09:00:00Z"),
				activity("push", "refs/heads/main", "2026-01-01T09:00:00Z"),
			],
			new Date("2026-01-10T00:00:00Z"),
		);
		expect(pushes.map((p) => [p.repo, p.branch, p.head])).toEqual([
			["acme/web", "feature/a", "h1"],
			["acme/web", "feature/b", "h"],
		]);
	});
});

describe("reposPushedSince", () => {
	it("keeps live repos pushed since a date, most recent first", () => {
		expect(
			reposPushedSince(
				[
					{
						full_name: "a/old",
						archived: false,
						pushed_at: "2026-01-01T00:00:00Z",
					},
					{
						full_name: "a/x",
						archived: false,
						pushed_at: "2026-01-12T00:00:00Z",
					},
					{
						full_name: "a/y",
						archived: false,
						pushed_at: "2026-01-14T00:00:00Z",
					},
					{
						full_name: "a/gone",
						archived: true,
						pushed_at: "2026-01-14T00:00:00Z",
					},
				],
				new Date("2026-01-10T00:00:00Z"),
			),
		).toEqual(["a/y", "a/x"]);
	});
});

describe("commit service, push logs", () => {
	it("finds pushes the events feed dropped, on any branch, once each", async () => {
		const fetch = fakeFetch({
			// The feed only knows about the push to main.
			"/users/ada/events": [
				event("1", "2026-01-14T08:00:00Z", {
					ref: "refs/heads/main",
					head: "m1",
					before: "m0",
				}),
			],
			"/user/repos": [
				{
					full_name: "acme/api",
					archived: false,
					pushed_at: "2026-01-14T10:00:00Z",
				},
				{
					full_name: "acme/web",
					archived: false,
					pushed_at: "2026-01-14T08:00:00Z",
				},
			],
			"/repos/acme/web/activity": [
				{
					activity_type: "push",
					ref: "refs/heads/main",
					before: "m0",
					after: "m1",
					timestamp: "2026-01-14T08:00:00Z",
				},
			],
			"/repos/acme/api/activity": (url: URL) => {
				expect(url.searchParams.get("actor")).toBe("ada");
				return [
					{
						activity_type: "push",
						ref: "refs/heads/feature/login",
						before: "f0",
						after: "f1",
						timestamp: "2026-01-14T10:00:00Z",
					},
				];
			},
			"/repos/acme/web/compare/m0...m1": {
				commits: [commit("m1", "ada", "2026-01-14T07:50:00Z")],
			},
			"/repos/acme/api/compare/f0...f1": {
				commits: [commit("f1", "ada", "2026-01-14T09:50:00Z")],
			},
		});
		const api = createGitHubApi("t", fetch);
		const commits = await createGitHubCommitService(api).recent(
			"ada",
			new Date("2026-01-14T00:00:00Z"),
			new Date("2026-01-15T00:00:00Z"),
		);
		expect(commits.map((c) => [c.sha, c.repo, c.branch])).toEqual([
			["f1", "acme/api", "feature/login"],
			["m1", "acme/web", "main"],
		]);
		// The push known to both sources is expanded once.
		expect(
			fetch.mock.calls.filter(([u]) => String(u).includes("/compare/m0...m1")),
		).toHaveLength(1);
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
