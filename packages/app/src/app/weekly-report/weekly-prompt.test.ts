import type { ActivityItem, MetricSeries } from "@dashboard/core/insights";
import { describe, expect, it } from "vitest";
import { weeklyReportPrompt } from "./weekly-prompt";

const activity = (
	id: string,
	kind: ActivityItem["kind"],
	title: string,
	project?: string,
	context?: string,
): ActivityItem => ({
	id,
	source: "github",
	kind,
	title,
	url: `https://x.test/${id}`,
	at: "2026-11-18T10:00:00.000Z",
	context,
	project,
});

const series: MetricSeries = {
	id: "github.prs-merged",
	source: "github",
	label: "PRs merged",
	unit: "count",
	description: "",
	values: [2, 4, null, 6, 9, 1],
};

describe("weekly report prompt", () => {
	const prompt = weeklyReportPrompt({
		title: "Last week",
		from: new Date(2026, 10, 16),
		activity: [
			activity("1", "pr_merged", "Header", "acme/web", "acme/web #1"),
			activity("2", "commit", "Fix a", "acme/web", "acme/web (main)"),
			activity("3", "commit", "Fix b", "acme/web", "acme/web (main)"),
			activity("4", "issue_resolved", "Login bug", "EMI"),
			activity("5", "meeting", "Planning"),
		],
		metrics: [series],
		weekIndex: 4,
	});

	it("groups by project, busiest first, unscoped last", () => {
		const web = prompt.indexOf("## acme/web");
		const emi = prompt.indexOf("## EMI");
		const other = prompt.indexOf("## No project");
		expect(web).toBeGreaterThan(-1);
		expect(web).toBeLessThan(emi);
		expect(emi).toBeLessThan(other);
		expect(prompt).toContain("- Committed 2 commits to acme/web (main): Fix");
		expect(prompt).toContain("- Meetings: 1");
	});

	it("compares the week's numbers with the weeks before", () => {
		expect(prompt).toContain(
			"- PRs merged: 9 (average of the 3 weeks before: 4)",
		);
	});

	it("names the whole week, not today", () => {
		expect(prompt).toMatch(/^Week: Last week \(.*16.*–.*22.*\)/);
	});
});
