import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { searchIssuesFixture } from "./__fixtures__/search-issues";
import { createGitHubApi } from "./api/client";
import { githubSearchItemSchema } from "./api/schemas";
import { GITHUB_QUERIES } from "./constants";
import { repoFullName, toWorkItem } from "./mapper";
import { createGitHubService } from "./service";

const parseItem = (index: number) =>
	githubSearchItemSchema.parse(searchIssuesFixture.items[index]);
const draftPr = parseItem(0);
const plainPr = parseItem(1);

describe("github mapper", () => {
	it("maps a search item to a WorkItem", () => {
		expect(toWorkItem(draftPr, "review_request")).toEqual({
			id: "github:review_request:2001",
			source: "github",
			kind: "review_request",
			title: "Add dark mode",
			url: "https://github.com/acme/web/pull/42",
			updatedAt: "2026-01-02T10:00:00Z",
			context: "acme/web #42",
			project: "acme/web",
			detailRef: "acme/web#42",
			status: "Draft",
			actor: {
				name: "octocat",
				avatarUrl: "https://avatars.githubusercontent.com/u/1",
			},
			tags: ["ui"],
		});
	});

	it("handles deleted users and non-drafts", () => {
		const item = toWorkItem(plainPr, "pull_request");
		expect(item.actor).toBeUndefined();
		expect(item.status).toBeUndefined();
	});

	it("extracts the repo name", () => {
		expect(repoFullName("https://api.github.com/repos/a/b")).toBe("a/b");
	});
});

describe("github service", () => {
	it("queries review requests through the API", async () => {
		const fetch = fakeFetch({ "/search/issues": searchIssuesFixture });
		const service = createGitHubService(createGitHubApi("token", fetch));

		const items = await service.reviewRequests();

		expect(items.map((i) => i.kind)).toEqual([
			"review_request",
			"review_request",
		]);
		const url = new URL(String(fetch.mock.calls[0]?.[0]));
		expect(url.searchParams.get("q")).toBe(GITHUB_QUERIES.reviewRequests);
		expect(url.searchParams.get("sort")).toBe("updated");
	});

	const routeByQuery =
		(answers: Partial<Record<string, typeof searchIssuesFixture.items>>) =>
		(url: URL) => {
			const items = answers[url.searchParams.get("q") ?? ""] ?? [];
			return { total_count: items.length, items };
		};
	const [pr2001, pr2002] = searchIssuesFixture.items;
	const queriesOf = (fetch: ReturnType<typeof fakeFetch>) =>
		fetch.mock.calls
			.map((c) => new URL(String(c[0])).searchParams.get("q"))
			.sort();

	it("searches only assigned PRs for 'assigned', marked as assigned", async () => {
		const fetch = fakeFetch({
			"/search/issues": routeByQuery({ [GITHUB_QUERIES.assigned]: [pr2002] }),
		});
		const items = await createGitHubService(
			createGitHubApi("t", fetch),
		).myPullRequests("assigned");

		expect(queriesOf(fetch)).toEqual([GITHUB_QUERIES.assigned]);
		expect(items.map((i) => i.kind)).toEqual(["assigned_pull_request"]);
	});

	it("searches authored PRs plus their signals for 'created'", async () => {
		const fetch = fakeFetch({ "/search/issues": routeByQuery({}) });
		await createGitHubService(createGitHubApi("t", fetch)).myPullRequests(
			"created",
		);
		expect(queriesOf(fetch)).toEqual(
			[
				GITHUB_QUERIES.authored,
				GITHUB_QUERIES.changesRequested,
				GITHUB_QUERIES.checksFailing,
			].sort(),
		);
	});

	it("merges authored and assigned PRs for 'all'; authored wins and carries signals", async () => {
		const fetch = fakeFetch({
			"/search/issues": routeByQuery({
				[GITHUB_QUERIES.authored]: [pr2001, pr2002],
				[GITHUB_QUERIES.assigned]: [pr2002],
				[GITHUB_QUERIES.changesRequested]: [pr2002],
				[GITHUB_QUERIES.checksFailing]: [pr2002],
			}),
		});
		const items = await createGitHubService(
			createGitHubApi("t", fetch),
		).myPullRequests("all");

		expect(
			items
				.map((i) => [i.id, i.kind, i.status])
				.sort(([a], [b]) => String(a).localeCompare(String(b))),
		).toEqual([
			["github:pull_request:2001", "pull_request", "Draft"],
			[
				"github:pull_request:2002",
				"pull_request",
				"Changes requested · Checks failing",
			],
		]);
	});

	it("lists PRs needing action with all their signals", async () => {
		const fetch = fakeFetch({
			"/search/issues": routeByQuery({
				[GITHUB_QUERIES.changesRequested]: [pr2002],
				[GITHUB_QUERIES.checksFailing]: [pr2001, pr2002],
			}),
		});
		const needing = await createGitHubService(
			createGitHubApi("t", fetch),
		).prsNeedingAction();

		expect(
			needing
				.map((n) => [n.item.id, n.signals])
				.sort(([a], [b]) => String(a).localeCompare(String(b))),
		).toEqual([
			["github:pull_request:2001", ["checks_failing"]],
			["github:pull_request:2002", ["changes_requested", "checks_failing"]],
		]);
	});
});
