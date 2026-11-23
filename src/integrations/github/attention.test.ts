import { describe, expect, it } from "vitest";
import type { WorkItem } from "#/core/work-item";
import {
	criticalAlertsToAttention,
	prSignalsToAttention,
	reviewRequestsToAttention,
} from "./attention";
import { alertsToWorkItems } from "./dependabot";

const NOW = new Date("2026-01-05T12:00:00Z");
const pr = (id: string, updatedAt: string): WorkItem => ({
	id: `github:review_request:${id}`,
	source: "github",
	kind: "review_request",
	title: id,
	url: `https://github.com/acme/web/pull/${id}`,
	updatedAt,
	context: `acme/web #${id}`,
});

describe("github attention", () => {
	it("escalates review requests idle for more than a day", () => {
		const [fresh, stale] = reviewRequestsToAttention(
			[pr("1", "2026-01-05T10:00:00Z"), pr("2", "2026-01-03T12:00:00Z")],
			NOW,
		);
		expect(fresh).toMatchObject({
			reason: "review_requested",
			urgency: "soon",
			label: "Review requested",
			context: "acme/web #1",
		});
		expect(stale).toMatchObject({
			urgency: "today",
			label: "Review waiting since 2 days ago",
		});
	});
});

describe("github PR signals", () => {
	it("flags your PRs needing changes or with failing checks as today", () => {
		const ownPr = (id: string, updatedAt: string) => ({
			...pr(id, updatedAt),
			kind: "pull_request" as const,
			id: `github:pull_request:${id}`,
		});
		const items = prSignalsToAttention([
			{ item: ownPr("1", "2026-01-05T10:00:00Z"), signals: ["checks_failing"] },
			{
				item: ownPr("2", "2026-01-04T10:00:00Z"),
				signals: ["changes_requested", "checks_failing"],
			},
		]);
		expect(items.map((i) => [i.reason, i.urgency, i.label])).toEqual([
			["checks_failing", "today", "Checks failing"],
			["changes_requested", "today", "Changes requested · Checks failing"],
		]);
		// Own id suffix: never collides with the PR's other attention items.
		expect(items[0]?.id).toBe("github:pull_request:1:signals");
	});
});

describe("criticalAlertsToAttention", () => {
	const alert = (number: number, severity: string, fix: string | null) => ({
		number,
		state: "open",
		html_url: `https://github.com/acme/web/security/dependabot/${number}`,
		created_at: "2026-01-01T00:00:00Z",
		dependency: {
			package: { ecosystem: "npm", name: "lodash" },
			manifest_path: "package-lock.json",
		},
		security_advisory: {
			ghsa_id: `GHSA-${number}`,
			cve_id: null,
			summary: "Command injection",
			severity,
		},
		security_vulnerability: {
			vulnerable_version_range: "< 4.17.21",
			first_patched_version: fix ? { identifier: fix } : null,
		},
	});

	it("keeps only critical alerts, due today, with the fix in the label", () => {
		const items = criticalAlertsToAttention(
			alertsToWorkItems("acme/web", [
				alert(1, "critical", "4.17.21"),
				alert(2, "high", "4.17.21"),
				alert(3, "critical", null),
			]),
		);
		expect(items.map((i) => [i.reason, i.urgency, i.label])).toEqual([
			["security_alert", "today", "Critical vulnerability · Fix: 4.17.21"],
			["security_alert", "today", "Critical vulnerability · No fix yet"],
		]);
		expect(items[0]).toMatchObject({
			title: "lodash: Command injection",
			project: "acme/web",
			context: "acme/web · GHSA-1",
		});
	});
});
