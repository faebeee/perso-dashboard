import { describe, expect, it } from "vitest";
import type { GitHubPull } from "./api/schemas";
import { parsePrDetailRef, prDetailRef, toPullRequestDetail } from "./detail";

const pull = (extra: Partial<GitHubPull> = {}): GitHubPull => ({
	number: 42,
	title: "Fix checkout",
	html_url: "https://github.com/acme/web/pull/42",
	state: "open",
	draft: false,
	merged_at: null,
	created_at: "2026-01-05T10:00:00Z",
	updated_at: "2026-01-06T10:00:00Z",
	body_html: "<p>Fixes the button</p>",
	user: { login: "ada" },
	head: { ref: "fix/checkout", sha: "abc" },
	base: { ref: "main" },
	additions: 10,
	deletions: 2,
	changed_files: 1,
	labels: [{ name: "bug" }],
	requested_reviewers: [],
	requested_teams: [],
	...extra,
});

const build = (
	extra: Parameters<typeof toPullRequestDetail>[0] extends infer I
		? Partial<I>
		: never,
) =>
	toPullRequestDetail({
		repo: "acme/web",
		pull: pull(),
		reviews: [],
		files: [],
		checkRuns: { check_runs: [] },
		statuses: { statuses: [] },
		...extra,
	});

describe("PR detail refs", () => {
	it("round-trips owner/repo#number", () => {
		expect(prDetailRef("acme/web", 42)).toBe("acme/web#42");
		expect(parsePrDetailRef("acme/web#42")).toEqual({
			repo: "acme/web",
			number: 42,
		});
		expect(parsePrDetailRef("WEB-1")).toBeNull();
	});
});

describe("toPullRequestDetail", () => {
	it("keeps each reviewer's latest verdict; comments don't undo it", () => {
		const detail = build({
			reviews: [
				{ user: { login: "bob" }, state: "CHANGES_REQUESTED" },
				{ user: { login: "bob" }, state: "COMMENTED" },
				{ user: { login: "cy" }, state: "APPROVED" },
				{ user: { login: "cy" }, state: "CHANGES_REQUESTED" },
				{ user: { login: "di" }, state: "COMMENTED" },
				{ user: { login: "me" }, state: "PENDING" },
			],
			pull: pull({
				requested_reviewers: [{ login: "ed" }],
				requested_teams: [{ name: "backend" }],
			}),
		});
		expect(detail.reviewers.map((r) => [r.name, r.verdict])).toEqual([
			["bob", "changes_requested"],
			["cy", "changes_requested"],
			["di", "commented"],
			["ed", "pending"],
			["@backend", "pending"],
		]);
	});

	it("treats a re-requested review as pending again", () => {
		const detail = build({
			reviews: [{ user: { login: "bob" }, state: "APPROVED" }],
			pull: pull({ requested_reviewers: [{ login: "bob" }] }),
		});
		expect(detail.reviewers).toEqual([
			expect.objectContaining({ name: "bob", verdict: "pending" }),
		]);
	});

	it("combines check runs and commit statuses into four states", () => {
		const detail = build({
			checkRuns: {
				check_runs: [
					{ name: "test", status: "completed", conclusion: "success" },
					{ name: "lint", status: "completed", conclusion: "failure" },
					{ name: "e2e", status: "in_progress", conclusion: null },
					{ name: "deploy", status: "completed", conclusion: "skipped" },
				],
			},
			statuses: { statuses: [{ context: "ci/legacy", state: "error" }] },
		});
		expect(detail.checks.map((c) => [c.name, c.state])).toEqual([
			["test", "success"],
			["lint", "failure"],
			["e2e", "pending"],
			["deploy", "neutral"],
			["ci/legacy", "failure"],
		]);
	});

	it("derives the state: merged, closed, draft, open", () => {
		expect(
			build({
				pull: pull({ merged_at: "2026-01-07T00:00:00Z", state: "closed" }),
			}).state,
		).toBe("merged");
		expect(build({ pull: pull({ state: "closed" }) }).state).toBe("closed");
		expect(build({ pull: pull({ draft: true }) }).state).toBe("draft");
		expect(build({}).state).toBe("open");
	});
});
