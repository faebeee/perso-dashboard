import { fakeFetch } from "@dashboard/platform/testing/fake-fetch";
import { describe, expect, it } from "vitest";
import { searchIssuesFixture } from "./__fixtures__/search-issues";
import { createGitHubApi } from "./api/client";
import { githubRepoListSchema } from "./api/schemas";
import {
	loadRepoOptions,
	repoOptions,
	repoQuery,
	withRepoFilter,
} from "./repo-filter";

const repo = (full_name: string, extra: Record<string, unknown> = {}) => ({
	full_name,
	...extra,
});

describe("repo filter", () => {
	it("leaves the API untouched when no repos are chosen", () => {
		const api = createGitHubApi("t", fakeFetch({}));
		expect(withRepoFilter(api, [])).toBe(api);
	});

	it("narrows search to the chosen repos, in the query and the results", async () => {
		const fetch = fakeFetch({ "/search/issues": searchIssuesFixture });
		const api = withRepoFilter(createGitHubApi("t", fetch), ["ACME/web"]);

		const res = await api.searchIssues("is:pr author:@me");

		const q = new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get("q");
		expect(q).toBe("is:pr author:@me repo:ACME/web");
		expect(res.items.map((i) => i.repository_url)).toEqual([
			"https://api.github.com/repos/acme/web",
		]);
	});

	it("filters your repos and events", async () => {
		const fetch = fakeFetch({
			"/user/repos": [repo("acme/web"), repo("acme/api")],
			"/users/me/events": [
				{
					id: "1",
					type: "PushEvent",
					created_at: "2026-01-01T00:00:00Z",
					repo: { name: "acme/api" },
					payload: {},
				},
			],
		});
		const api = withRepoFilter(createGitHubApi("t", fetch), ["acme/web"]);

		expect((await api.userRepos()).map((r) => r.full_name)).toEqual([
			"acme/web",
		]);
		expect(await api.userEvents("me")).toEqual([]);
	});

	it("builds the query with one qualifier per repo", () => {
		expect(repoQuery("is:pr", ["a/b", "c/d"])).toBe("is:pr repo:a/b repo:c/d");
	});
});

describe("repo options", () => {
	it("sorts alphabetically, archived last, and tags them", () => {
		const options = repoOptions(
			githubRepoListSchema.parse([
				repo("acme/old", { archived: true }),
				repo("acme/web", { private: true }),
				repo("acme/api"),
			]),
		);
		expect(options).toEqual([
			{ value: "acme/api", label: "acme/api", badge: undefined },
			{ value: "acme/web", label: "acme/web", badge: "Private" },
			{ value: "acme/old", label: "acme/old", badge: "Archived" },
		]);
	});

	it("reads every page of your repos", async () => {
		const full = Array.from({ length: 100 }, (_, i) => repo(`acme/r${i}`));
		const fetch = fakeFetch({
			"/user/repos": (url: URL) =>
				url.searchParams.get("page") === "1" ? full : [repo("acme/last")],
		});
		const options = await loadRepoOptions(createGitHubApi("t", fetch));
		expect(options).toHaveLength(101);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
