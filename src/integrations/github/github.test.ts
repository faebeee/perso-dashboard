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

	it.each([
		["created", [GITHUB_QUERIES.authored]],
		["assigned", [GITHUB_QUERIES.assigned]],
	] as const)("searches PRs for scope %s", async (scope, queries) => {
		const fetch = fakeFetch({ "/search/issues": searchIssuesFixture });
		await createGitHubService(createGitHubApi("t", fetch)).myPullRequests(
			scope,
		);
		expect(
			fetch.mock.calls.map((c) => new URL(String(c[0])).searchParams.get("q")),
		).toEqual(queries);
	});

	it("merges authored and assigned PRs for 'all' without duplicates", async () => {
		const fetch = fakeFetch({
			"/search/issues": (url: URL) =>
				url.searchParams.get("q") === GITHUB_QUERIES.authored
					? searchIssuesFixture
					: { total_count: 1, items: [searchIssuesFixture.items[1]] },
		});
		const items = await createGitHubService(
			createGitHubApi("t", fetch),
		).myPullRequests("all");

		expect(fetch).toHaveBeenCalledTimes(2);
		expect(items.map((i) => i.id)).toEqual([
			"github:pull_request:2001",
			"github:pull_request:2002",
		]);
	});
});
