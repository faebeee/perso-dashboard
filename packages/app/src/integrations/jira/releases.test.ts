import { fakeFetch } from "@dashboard/platform/testing/fake-fetch";
import { describe, expect, it } from "vitest";
import { createJiraApi } from "./api/client";
import { createJiraReleaseService } from "./releases";

const site = {
	cloudId: "cloud-1",
	siteUrl: "https://acme.atlassian.net",
	siteName: "Acme",
};

const issue = (id: string, key: string, name: string) => ({
	id,
	key: `${key}-${id}`,
	fields: {
		summary: "x",
		updated: "2026-01-02T10:00:00.000+0000",
		project: { key, name },
	},
});

describe("jira releases", () => {
	it("collects versions of projects I recently worked in", async () => {
		const fetch = fakeFetch({
			"/ex/jira/cloud-1/rest/api/3/search/jql": {
				issues: [issue("1", "WEB", "Website"), issue("2", "WEB", "Website")],
			},
			"/ex/jira/cloud-1/rest/api/3/project/WEB/version": {
				values: [
					{
						id: "100",
						name: "2.0",
						released: false,
						releaseDate: "2026-01-20",
					},
					{
						id: "101",
						name: "1.9",
						released: false,
						overdue: true,
						releaseDate: "2025-12-20",
					},
					{ id: "102", name: "1.8", released: true, releaseDate: "2026-01-03" },
					{ id: "103", name: "1.7", released: true, releaseDate: "2025-10-01" }, // too old
					{ id: "104", name: "old", released: false, archived: true },
				],
			},
		});

		const releases = await createJiraReleaseService(
			createJiraApi("t", fetch),
			site,
		).releases({ releasedSince: new Date("2026-01-01T00:00:00Z") });

		expect(releases.map((r) => [r.name, r.state, r.tags])).toEqual([
			["2.0", "upcoming", []],
			["1.9", "upcoming", ["Overdue"]],
			["1.8", "released", []],
		]);
		expect(releases[0]).toMatchObject({
			id: "jira:version:100",
			project: "Website",
			url: "https://acme.atlassian.net/projects/WEB/versions/100",
		});

		// one search + one version call for the single detected project
		expect(fetch).toHaveBeenCalledTimes(2);
		const jql = new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get(
			"jql",
		);
		expect(jql).toContain('updated >= "2026-01-01"');
	});
});
