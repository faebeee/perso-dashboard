import { describe, expect, it } from "vitest";
import { IntegrationFailure } from "#/core/result";
import { fakeFetch } from "#/test/fake-fetch";
import { createJiraApi } from "./api/client";
import { jiraIssueSchema } from "./api/schemas";
import { toWorkItem } from "./mapper";
import { createJiraService, readJiraSite, resolveJiraSite } from "./service";

const site = {
	cloudId: "cloud-1",
	siteUrl: "https://acme.atlassian.net",
	siteName: "Acme",
};

const searchResponse = {
	issues: [
		{
			id: "10001",
			key: "WEB-12",
			self: "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/issue/10001",
			fields: {
				summary: "Checkout button misaligned",
				updated: "2026-01-02T10:00:00.000+0100",
				status: { name: "In Progress" },
				priority: { name: "High" },
				issuetype: { name: "Bug" },
				project: { key: "WEB", name: "Website" },
				reporter: {
					displayName: "Ada Lovelace",
					avatarUrls: { "48x48": "https://avatar/ada.png" },
				},
				assignee: {
					displayName: "Linus Torvalds",
					avatarUrls: { "48x48": "https://avatar/linus.png" },
				},
			},
		},
	],
	isLast: true,
};

describe("jira mapper", () => {
	it("maps an issue to a WorkItem with a browse URL", () => {
		const issue = jiraIssueSchema.parse(searchResponse.issues[0]);
		expect(toWorkItem(issue, site.siteUrl)).toEqual({
			id: "jira:10001",
			source: "jira",
			kind: "issue",
			title: "Checkout button misaligned",
			url: "https://acme.atlassian.net/browse/WEB-12",
			updatedAt: "2026-01-02T09:00:00.000Z",
			context: "WEB-12 · Website",
			project: "Website",
			status: "In Progress",
			actor: { name: "Ada Lovelace", avatarUrl: "https://avatar/ada.png" },
			assignee: {
				name: "Linus Torvalds",
				avatarUrl: "https://avatar/linus.png",
			},
			tags: ["Bug", "High"],
		});
	});
});

describe("jira mapper: assignee", () => {
	it("marks unassigned issues explicitly", () => {
		const issue = jiraIssueSchema.parse({
			...searchResponse.issues[0],
			fields: { ...searchResponse.issues[0]?.fields, assignee: null },
		});
		expect(toWorkItem(issue, site.siteUrl).assignee).toBeNull();
	});
});

describe("jira service", () => {
	const jqlFor = async (
		call: (service: ReturnType<typeof createJiraService>) => Promise<unknown>,
	) => {
		const fetch = fakeFetch({
			"/ex/jira/cloud-1/rest/api/3/search/jql": searchResponse,
		});
		await call(createJiraService(createJiraApi("token", fetch), site));
		return new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get("jql");
	};

	it("maps search results", async () => {
		const fetch = fakeFetch({
			"/ex/jira/cloud-1/rest/api/3/search/jql": searchResponse,
		});
		const items = await createJiraService(
			createJiraApi("token", fetch),
			site,
		).myIssues("all");
		expect(items.map((i) => i.id)).toEqual(["jira:10001"]);
	});

	it.each([
		[
			"all",
			"statusCategory != Done AND (assignee = currentUser() OR reporter = currentUser()) ORDER BY updated DESC",
		],
		[
			"assigned",
			"statusCategory != Done AND assignee = currentUser() ORDER BY updated DESC",
		],
		[
			"created",
			"statusCategory != Done AND reporter = currentUser() ORDER BY updated DESC",
		],
	] as const)("my issues JQL for scope %s", async (scope, expected) => {
		expect(await jqlFor((s) => s.myIssues(scope))).toBe(expected);
	});

	it.each([
		[
			"all",
			'status IN ("On Release", "Bereit für Release") ORDER BY updated DESC',
		],
		[
			"assigned",
			'status IN ("On Release", "Bereit für Release") AND assignee = currentUser() ORDER BY updated DESC',
		],
		[
			"created",
			'status IN ("On Release", "Bereit für Release") AND reporter = currentUser() ORDER BY updated DESC',
		],
	] as const)("on-release JQL for scope %s", async (scope, expected) => {
		expect(await jqlFor((s) => s.onRelease(scope))).toBe(expected);
	});

	it("finds old overdue issues with a separate due-date search and dedupes", async () => {
		const issue = (id: string, extra: Record<string, unknown> = {}) => ({
			id,
			key: `WEB-${id}`,
			fields: {
				summary: id,
				updated: "2026-01-02T10:00:00.000+0100",
				...extra,
			},
		});
		const fetch = fakeFetch({
			"/ex/jira/cloud-1/rest/api/3/search/jql": (url: URL) =>
				url.searchParams.get("jql")?.includes("duedate")
					? { issues: [issue("1", { duedate: "2025-06-01" }), issue("2")] }
					: { issues: [issue("2"), issue("3")] },
		});
		const service = createJiraService(createJiraApi("token", fetch), site);

		const candidates = await service.urgentCandidates();

		expect(candidates.map((i) => i.id)).toEqual(["1", "2", "3"]);
		const jqls = fetch.mock.calls.map((call) =>
			new URL(String(call[0])).searchParams.get("jql"),
		);
		expect(jqls).toContain(
			"statusCategory != Done AND assignee = currentUser() AND duedate <= endOfDay() ORDER BY duedate ASC",
		);
	});

	it("resolves the first site with Jira access", async () => {
		const fetch = fakeFetch({
			"/oauth/token/accessible-resources": [
				{
					id: "conf",
					url: "https://c.atlassian.net",
					name: "Wiki",
					scopes: [],
				},
				{
					id: "cloud-1",
					url: site.siteUrl,
					name: "Acme",
					scopes: ["read:jira-work"],
				},
			],
		});
		await expect(
			resolveJiraSite(createJiraApi("token", fetch)),
		).resolves.toEqual(site);
	});

	it("asks for a reconnect when the site meta is missing", () => {
		expect(() => readJiraSite({})).toThrow(IntegrationFailure);
	});
});
