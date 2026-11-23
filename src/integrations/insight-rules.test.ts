import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "#/core/calendar-event";
import { lastWeeks } from "#/core/insights";
import type { GitHubSearchItem } from "./github/api/schemas";
import { prActivity, prMetrics } from "./github/insights";
import { insightQueries as gmailQueries } from "./gmail/insights";
import { meetingActivity, meetingMetrics } from "./google-calendar/insights";
import type { JiraIssue } from "./jira/api/schemas";
import { insightJql, issueActivity } from "./jira/insights";

const NOW = new Date(2026, 0, 14, 15, 0); // Wednesday
const at = (day: number, h = 12) => new Date(2026, 0, day, h).toISOString();
const weeks = lastWeeks(2, NOW); // Jan 5–12, Jan 12–19

describe("github insights", () => {
	const pr = (
		id: number,
		extra: Partial<GitHubSearchItem>,
	): GitHubSearchItem => ({
		id,
		number: id,
		title: `PR ${id}`,
		html_url: `https://github.com/acme/web/pull/${id}`,
		updated_at: at(13),
		state: "closed",
		repository_url: "https://api.github.com/repos/acme/web",
		user: null,
		labels: [],
		...extra,
	});

	it("keeps only activity inside the exact range", () => {
		const from = new Date(2026, 0, 13);
		const items = prActivity(
			{
				merged: [
					pr(1, { pull_request: { merged_at: at(13) } }),
					pr(2, { pull_request: { merged_at: at(12) } }), // before range
				],
				opened: [pr(3, { created_at: at(14, 9) })],
				reviewed: [pr(4, { updated_at: at(13, 16) })],
			},
			from,
			NOW,
		);
		expect(items.map((i) => [i.kind, i.title, i.context])).toEqual([
			["pr_merged", "PR 1", "acme/web #1"],
			["pr_opened", "PR 3", "acme/web #3"],
			["pr_reviewed", "PR 4", "acme/web #4"],
		]);
	});

	it("counts merges and takes the median cycle time per week", () => {
		const [merged, cycle] = prMetrics(
			{
				merged: [
					pr(1, { created_at: at(5), pull_request: { merged_at: at(6) } }), // 1 day
					pr(2, { created_at: at(5), pull_request: { merged_at: at(8) } }), // 3 days
					pr(3, { created_at: at(12), pull_request: { merged_at: at(14) } }), // 2 days
				],
				reviewed: [],
			},
			weeks,
		);
		expect(merged?.values).toEqual([2, 1]);
		expect(cycle?.values).toEqual([2, 2]);
	});
});

describe("jira insights", () => {
	const issue = (
		id: string,
		fields: Partial<JiraIssue["fields"]>,
	): JiraIssue => ({
		id,
		key: `WEB-${id}`,
		fields: { summary: id, updated: at(13), ...fields },
	});
	it("reports resolved issues once, not also as worked on", () => {
		const items = issueActivity(
			{
				resolved: [issue("1", { resolutiondate: at(13) })],
				workedOn: [issue("1", {}), issue("2", { updated: at(14, 10) })],
			},
			"https://acme.atlassian.net",
			new Date(2026, 0, 13),
			NOW,
		);
		expect(items.map((i) => [i.kind, i.title, i.detailRef])).toEqual([
			["issue_resolved", "1", "WEB-1"],
			["issue_worked", "2", "WEB-2"],
		]);
	});

	it("builds JQL with day-widened ranges", () => {
		expect(insightJql.resolved(new Date(2026, 0, 13), NOW)).toBe(
			'assignee = currentUser() AND resolved >= "2026/01/12" AND resolved < "2026/01/15" ORDER BY resolved DESC',
		);
	});
});

describe("calendar insights", () => {
	const event = (
		start: string,
		end: string,
		allDay = false,
	): CalendarEvent => ({
		id: start,
		source: "google-calendar",
		title: "Sync",
		url: "#",
		start,
		end,
		allDay,
		isOrganizer: true,
	});
	it("sums meeting hours per week, only up to now", () => {
		const [hours] = meetingMetrics(
			[
				event(at(6, 10), at(6, 11)),
				event(at(7, 9), at(7, 10)),
				event(at(14, 14), at(14, 16)), // half past "now" (15:00)
				event("2026-01-13", "2026-01-14", true),
			],
			weeks,
			NOW,
		);
		expect(hours?.values).toEqual([2, 1]);
	});

	it("lists meetings in the range as activity", () => {
		expect(
			meetingActivity(
				[event(at(13, 10), at(13, 11))],
				new Date(2026, 0, 13),
				NOW,
			).map((i) => [i.kind, i.context]),
		).toEqual([["meeting", "1h"]]);
	});
});

describe("gmail insights", () => {
	it("uses exact Unix-time ranges", () => {
		expect(
			gmailQueries.sent(new Date(1_000_000_000), new Date(2_000_000_000)),
		).toBe("in:sent after:1000000 before:2000000 -in:chats");
	});
});
