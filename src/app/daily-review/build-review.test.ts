import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "#/core/calendar-event";
import type { ActivityItem } from "#/core/insights";
import type { TodayItem } from "#/core/today";
import type { WaitingItem } from "#/core/waiting";
import { formatStandup } from "#/lib/standup";
import {
	buildDailyReview,
	collectProjects,
	scopeHeading,
} from "./build-review";

const NOW = new Date(2026, 0, 14, 9, 30); // Wednesday morning
const at = (day: number, h: number) => new Date(2026, 0, day, h);

const activity = (
	kind: ActivityItem["kind"],
	title: string,
	when: Date,
	extra: Partial<ActivityItem> = {},
): ActivityItem => ({
	id: `${kind}:${title}`,
	source: "github",
	kind,
	title,
	url: `https://x/${title}`,
	at: when.toISOString(),
	...extra,
});

const todayItem = (
	title: string,
	doneAt: Date | null,
	url?: string,
): TodayItem => ({
	id: title,
	kind: url ? "item" : "note",
	title,
	ref: url
		? { source: "github", itemKind: "pull_request", itemId: title, url }
		: undefined,
	done: doneAt !== null,
	doneAt,
	createdAt: at(13, 8),
});

describe("buildDailyReview", () => {
	const review = buildDailyReview({
		activity: [
			activity("pr_merged", "Fix checkout", at(13, 16), {
				context: "acme/web #12",
			}),
			activity("meeting", "Standup", at(13, 9)),
			activity("meeting", "Planning", at(13, 14)),
			activity("pr_reviewed", "Add cache", at(14, 8)),
		],
		completed: [
			todayItem("Write release notes", at(13, 17)),
			todayItem("Fix checkout", at(13, 16), "https://x/Fix checkout"), // also merged
		],
		openToday: [todayItem("Fix flaky test", null)],
		agenda: [
			{
				id: "e",
				source: "google-calendar",
				title: "1:1",
				url: "#",
				start: at(14, 11).toISOString(),
				end: new Date(2026, 0, 14, 11, 30).toISOString(),
				allDay: false,
				isOrganizer: false,
			} as CalendarEvent,
			{
				id: "e2",
				source: "google-calendar",
				title: "Review",
				url: "#",
				start: at(14, 14).toISOString(),
				end: at(14, 15).toISOString(),
				allDay: false,
				isOrganizer: true,
			},
		],
		waiting: [
			{
				id: "w",
				source: "github",
				reason: "awaiting_review",
				title: "Add retries",
				url: "#",
				since: at(10, 12).toISOString(),
				label: "No review for 3 days",
				context: "acme/api #9",
			} as WaitingItem,
		],
		now: NOW,
	});

	it("builds a newest-first timeline grouped by day", () => {
		expect(
			review.timeline.map((d) => [
				d.label,
				d.entries.map((e) => `${e.label} ${e.title}`),
			]),
		).toEqual([
			["Today", ["Reviewed Add cache"]],
			[
				"Yesterday",
				[
					"Done Write release notes",
					"Merged Fix checkout",
					"Done Fix checkout",
					"Meeting Planning",
					"Meeting Standup",
				],
			],
		]);
	});

	it("writes standup sections without repeating pinned items", () => {
		expect(
			formatStandup([review.done, review.today, review.blockers], "markdown"),
		).toBe(
			[
				"**Done**",
				"- Merged: Fix checkout (acme/web #12)",
				"- Reviewed: Add cache",
				"- 2 meetings",
				"- Done: Write release notes",
				"",
				"**Today**",
				"- Fix flaky test",
				"- 2 meetings (1h 30m)",
				"",
				"**Blockers**",
				"- No review for 3 days: Add retries (acme/api #9)",
			].join("\n"),
		);
	});
});

describe("formatStandup", () => {
	const sections = [
		{ title: "Done", lines: ["Merged: X"] },
		{ title: "Blockers", lines: [] },
	];
	it("formats for Slack and plain text, and says Nothing for empty sections", () => {
		expect(formatStandup(sections, "slack")).toBe(
			"*Done*\n• Merged: X\n\n*Blockers*\n• Nothing",
		);
		expect(formatStandup(sections, "plain")).toBe(
			"Done\n- Merged: X\n\nBlockers\n- Nothing",
		);
	});
});

describe("commits in the daily review", () => {
	it("lists commits in the timeline and condenses them in the standup", () => {
		const review = buildDailyReview({
			activity: [
				activity("commit", "Add cart", at(13, 10), {
					context: "acme/web (feature/cart)",
				}),
				activity("commit", "Fix rounding", at(13, 15), {
					context: "acme/web (feature/cart)",
				}),
			],
			completed: [],
			openToday: [],
			agenda: [],
			waiting: [],
			now: NOW,
		});
		expect(
			review.timeline[0]?.entries.map((e) => `${e.label} ${e.title}`),
		).toEqual(["Committed Fix rounding", "Committed Add cart"]);
		expect(review.done.lines).toEqual([
			"Committed 2 commits to acme/web (feature/cart): Fix rounding",
		]);
	});
});

describe("filtering the daily review by project", () => {
	const input = {
		activity: [
			activity("pr_merged", "Fix checkout", at(13, 16), {
				project: "acme/web",
				context: "acme/web #12",
			}),
			activity("commit", "Add cart", at(13, 10), {
				project: "acme/web",
				context: "acme/web (cart)",
			}),
			activity("issue_resolved", "Broken login", at(13, 11), {
				project: "Website",
				source: "jira",
			}),
			activity("pr_merged", "Bump deps", at(13, 12), {
				project: "acme/api",
				context: "acme/api #3",
			}),
			activity("meeting", "Standup", at(13, 9)),
		],
		completed: [todayItem("Write release notes", at(13, 17))],
		openToday: [
			{
				...todayItem("Review cart PR", null, "https://x/pr"),
				ref: {
					source: "github",
					itemKind: "pull_request",
					itemId: "p",
					url: "https://x/pr",
					project: "acme/web",
				},
			},
			todayItem("Call the bank", null),
		],
		agenda: [],
		waiting: [
			{
				id: "w",
				source: "github",
				reason: "awaiting_review" as const,
				title: "Add retries",
				url: "#",
				since: at(10, 12).toISOString(),
				label: "No review for 3 days",
				project: "acme/api",
			},
		],
		now: NOW,
	};

	it("lists the projects present, busiest first, with their sources", () => {
		expect(collectProjects(input)).toEqual([
			{ name: "acme/web", count: 3, sources: ["github"] },
			{ name: "acme/api", count: 2, sources: ["github"] },
			{ name: "Website", count: 1, sources: ["jira"] },
		]);
	});

	it("keeps only the chosen projects, and drops unscoped items unless asked", () => {
		const review = buildDailyReview({
			...input,
			filter: { projects: ["acme/web"], includeUnscoped: false },
		});
		expect(review.done.lines).toEqual([
			"Merged: Fix checkout (acme/web #12)",
			"Committed 1 commit to acme/web (cart): Add cart",
		]);
		expect(review.today.lines).toEqual(["Review cart PR"]);
		expect(review.blockers.lines).toEqual([]);
		expect(
			review.timeline.flatMap((d) => d.entries.map((e) => e.title)),
		).not.toContain("Standup");

		const withUnscoped = buildDailyReview({
			...input,
			filter: { projects: ["acme/web"], includeUnscoped: true },
		});
		expect(withUnscoped.done.lines).toContain("1 meeting");
		expect(withUnscoped.done.lines).toContain("Done: Write release notes");
		expect(withUnscoped.today.lines).toContain("Call the bank");
	});

	it("shows everything without a filter, and names the scope when filtered", () => {
		expect(buildDailyReview(input).blockers.lines).toHaveLength(1);
		expect(
			scopeHeading({
				projects: ["acme/web", "Website"],
				includeUnscoped: false,
			}),
		).toBe("Projects: acme/web, Website");
		expect(
			scopeHeading({ projects: [], includeUnscoped: false }),
		).toBeUndefined();
	});
});
