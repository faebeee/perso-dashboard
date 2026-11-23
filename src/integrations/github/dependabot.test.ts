import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { createGitHubApi } from "./api/client";
import type { GitHubDependabotAlertList } from "./api/schemas";
import {
	alertsToWorkItems,
	createDependabotService,
	reposToCheck,
	sortAlerts,
} from "./dependabot";

const alert = (
	number: number,
	severity: string,
	created: string,
	fix: string | null = "4.17.21",
): GitHubDependabotAlertList[number] => ({
	number,
	state: "open",
	html_url: `https://github.com/acme/web/security/dependabot/${number}`,
	created_at: created,
	dependency: {
		package: { ecosystem: "npm", name: "lodash" },
		manifest_path: "package-lock.json",
	},
	security_advisory: {
		ghsa_id: `GHSA-${number}`,
		cve_id: number === 1 ? "CVE-2021-23337" : null,
		summary: "Command injection",
		severity,
	},
	security_vulnerability: {
		vulnerable_version_range: "< 4.17.21",
		first_patched_version: fix ? { identifier: fix } : null,
	},
});

describe("reposToCheck", () => {
	it("keeps active repos you can write to, in order, up to the limit", () => {
		expect(
			reposToCheck(
				[
					{
						full_name: "a/admin",
						archived: false,
						permissions: { admin: true },
					},
					{
						full_name: "a/read-only",
						archived: false,
						permissions: { push: false },
					},
					{ full_name: "a/old", archived: true, permissions: { push: true } },
					{ full_name: "a/push", archived: false, permissions: { push: true } },
					{
						full_name: "a/third",
						archived: false,
						permissions: { push: true },
					},
				],
				2,
			),
		).toEqual(["a/admin", "a/push"]);
	});
});

describe("alertsToWorkItems", () => {
	it("maps alerts with severity, package, advisory id and the fix", () => {
		const [item, noFix] = alertsToWorkItems("acme/web", [
			alert(1, "critical", "2026-01-01T00:00:00Z"),
			alert(2, "low", "2026-01-02T00:00:00Z", null),
		]);
		expect(item).toMatchObject({
			kind: "security_alert",
			title: "lodash: Command injection",
			status: "Critical",
			context: "acme/web · CVE-2021-23337",
			project: "acme/web",
			tags: ["npm", "Fix: 4.17.21"],
		});
		expect(noFix?.context).toBe("acme/web · GHSA-2");
		expect(noFix?.tags).toEqual(["npm", "No fix yet"]);
	});

	it("sorts most severe first, then oldest first", () => {
		const items = alertsToWorkItems("acme/web", [
			alert(1, "medium", "2026-01-01T00:00:00Z"),
			alert(2, "critical", "2026-01-05T00:00:00Z"),
			alert(3, "critical", "2026-01-02T00:00:00Z"),
			alert(4, "low", "2025-12-01T00:00:00Z"),
		]);
		expect(sortAlerts(items).map((i) => i.id.split("#")[1])).toEqual([
			"3",
			"2",
			"1",
			"4",
		]);
	});
});

describe("Dependabot service", () => {
	it("asks for a reconnect when the permission is missing", async () => {
		const service = createDependabotService(
			createGitHubApi("t", fakeFetch({})),
		);
		await expect(
			service.openAlerts(["repo", "read:user"]),
		).rejects.toMatchObject({
			error: { kind: "unauthorized" },
		});
	});

	it("reads every repo and counts the ones that can't be read", async () => {
		const fetch = fakeFetch({
			"/user/repos": [
				{ full_name: "acme/web", permissions: { push: true } },
				{ full_name: "acme/disabled", permissions: { push: true } },
			],
			"/repos/acme/web/dependabot/alerts": [
				alert(1, "high", "2026-01-01T00:00:00Z"),
			],
		}); // acme/disabled → 404 (Dependabot off)
		const result = await createDependabotService(
			createGitHubApi("t", fetch),
		).openAlerts(["repo", "security_events"]);
		expect(result.items.map((i) => i.status)).toEqual(["High"]);
		expect(result).toMatchObject({ checkedRepos: 1, skippedRepos: 1 });
	});
});
