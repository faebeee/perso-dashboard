import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { searchIssuesFixture } from "./__fixtures__/search-issues";
import { createGitHubApi } from "./api/client";
import { createGitHubReleaseService } from "./releases";

const release = (id: number, overrides: Record<string, unknown> = {}) => ({
	id,
	name: `v1.${id}`,
	tag_name: `v1.${id}.0`,
	html_url: `https://github.com/acme/web/releases/tag/v1.${id}.0`,
	draft: false,
	prerelease: false,
	published_at: "2026-01-04T10:00:00Z",
	created_at: "2026-01-04T09:00:00Z",
	...overrides,
});

describe("github releases", () => {
	const since = new Date("2026-01-01T00:00:00Z");

	it("detects repos from recent PRs and keeps drafts + recent releases", async () => {
		const fetch = fakeFetch({
			// fixture has PRs in acme/web and acme/api
			"/search/issues": searchIssuesFixture,
			"/repos/acme/web/releases": [
				release(1, { draft: true, published_at: null, name: null }),
				release(2, { prerelease: true }),
				release(3, { published_at: "2025-11-01T00:00:00Z" }), // too old
			],
			"/repos/acme/api/releases": [],
		});

		const releases = await createGitHubReleaseService(
			createGitHubApi("t", fetch),
		).releases({ releasedSince: since });

		expect(releases).toEqual([
			expect.objectContaining({
				id: "github:release:1",
				name: "v1.1.0", // falls back to the tag name
				project: "acme/web",
				state: "upcoming",
				date: undefined,
				tags: ["Draft"],
			}),
			expect.objectContaining({
				id: "github:release:2",
				state: "released",
				date: "2026-01-04T10:00:00Z",
				tags: ["Pre-release"],
			}),
		]);

		const search = new URL(String(fetch.mock.calls[0]?.[0]));
		expect(search.searchParams.get("q")).toBe(
			"is:pr involves:@me updated:>=2026-01-01",
		);
	});

	it("skips repos that fail individually", async () => {
		const fetch = fakeFetch({
			"/search/issues": searchIssuesFixture,
			"/repos/acme/web/releases": [release(5)],
			// acme/api not routed → 404
		});
		const releases = await createGitHubReleaseService(
			createGitHubApi("t", fetch),
		).releases({ releasedSince: since });
		expect(releases.map((r) => r.id)).toEqual(["github:release:5"]);
	});
});
