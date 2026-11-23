import { describe, expect, it } from "vitest";
import type { ActivityItem } from "#/core/insights";
import {
	compareWeeks,
	formatMetric,
	formatSummaryMarkdown,
	groupActivity,
	summarizeCommits,
} from "./summary";

const activity = (
	kind: ActivityItem["kind"],
	title: string,
	context?: string,
): ActivityItem => ({
	id: `${kind}:${title}`,
	source: "x",
	kind,
	title,
	url: "#",
	at: "2026-01-13T10:00:00Z",
	context,
});

describe("summary", () => {
	const groups = groupActivity([
		activity("meeting", "Standup"),
		activity("pr_reviewed", "Add cache", "acme/api #7"),
		activity("pr_merged", "Fix checkout", "acme/web #12"),
		activity("meeting", "Planning"),
		activity("issue_resolved", "Broken login", "WEB-1 · Done"),
	]);

	it("groups activity in a fixed order", () => {
		expect(groups.map((g) => [g.label, g.items.length])).toEqual([
			["Merged", 1],
			["Resolved", 1],
			["Reviewed", 1],
			["Meetings", 2],
		]);
	});

	it("formats paste-ready Markdown", () => {
		expect(formatSummaryMarkdown("Since yesterday", groups)).toBe(
			[
				"**Since yesterday**",
				"",
				"**Merged (1)**",
				"- Fix checkout (acme/web #12)",
				"",
				"**Resolved (1)**",
				"- Broken login (WEB-1 · Done)",
				"",
				"**Reviewed (1)**",
				"- Add cache (acme/api #7)",
				"",
				"**Meetings:** 2 meetings",
			].join("\n"),
		);
		expect(formatSummaryMarkdown("Last week", [])).toBe(
			"**Last week**\n\nNothing recorded.",
		);
	});
});

describe("compareWeeks", () => {
	it("compares the last complete week with the average before it", () => {
		expect(compareWeeks([4, 6, null, 5, 7.5, 2])).toEqual({
			lastWeek: 7.5,
			average: 5,
			change: 0.5,
			thisWeek: 2,
		});
	});

	it("has no change without history", () => {
		expect(compareWeeks([3, 1])).toEqual({
			lastWeek: 3,
			average: null,
			change: null,
			thisWeek: 1,
		});
	});
});

describe("formatMetric", () => {
	it.each([
		[12, { unit: "count" as const }, "12"],
		[1234.4, { unit: "count" as const, approximate: true }, "≈ 1,234"],
		[12.5, { unit: "hours" as const }, "12h 30m"],
		[2.26, { unit: "days" as const }, "2.3d"],
		[null, { unit: "count" as const }, "—"],
	])("%s → %s", (value, series, expected) => {
		expect(formatMetric(value, series)).toBe(expected);
	});
});

describe("summarizeCommits", () => {
	const commit = (
		title: string,
		context: string,
		at: string,
	): ActivityItem => ({
		id: `c:${title}`,
		source: "github",
		kind: "commit",
		title,
		url: "#",
		at,
		context,
	});

	it("condenses commits per repo and branch, busiest first, with the latest message", () => {
		expect(
			summarizeCommits([
				commit("Add cart", "acme/web (feature/cart)", "2026-01-13T09:00:00Z"),
				commit(
					"Fix rounding",
					"acme/web (feature/cart)",
					"2026-01-13T15:00:00Z",
				),
				commit("Bump deps", "acme/api (main)", "2026-01-13T10:00:00Z"),
			]),
		).toEqual([
			"2 commits to acme/web (feature/cart): Fix rounding",
			"1 commit to acme/api (main): Bump deps",
		]);
	});

	it("is used for the commit group in Markdown", () => {
		const md = formatSummaryMarkdown(
			"Since yesterday",
			groupActivity([
				commit("Fix rounding", "acme/web (main)", "2026-01-13T15:00:00Z"),
			]),
		);
		expect(md).toBe(
			"**Since yesterday**\n\n**Committed (1)**\n- 1 commit to acme/web (main): Fix rounding",
		);
	});
});
