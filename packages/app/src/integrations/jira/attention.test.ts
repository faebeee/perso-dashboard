import type { Release } from "@dashboard/core/release";
import { describe, expect, it } from "vitest";
import type { JiraIssue } from "./api/schemas";
import { issuesToAttention, overdueReleasesToAttention } from "./attention";

const NOW = new Date(2026, 0, 5, 10, 0);
const SITE = "https://acme.atlassian.net";

const issue = (
	key: string,
	fields: Partial<JiraIssue["fields"]> = {},
): JiraIssue => ({
	id: key,
	key,
	fields: {
		summary: key,
		updated: "2026-01-04T10:00:00.000+0000",
		status: { name: "In Progress" },
		...fields,
	},
});

const run = (issues: JiraIssue[]) =>
	issuesToAttention(issues, SITE, NOW).map((i) => [
		i.title,
		i.reason,
		i.urgency,
		i.label,
	]);

describe("jira attention", () => {
	it("ranks overdue above due today above priority", () => {
		expect(
			run([
				issue("OVERDUE", { duedate: "2026-01-03", priority: { name: "Low" } }),
				issue("YESTERDAY", { duedate: "2026-01-04" }),
				issue("TODAY", {
					duedate: "2026-01-05",
					priority: { name: "Highest" },
				}),
				issue("BLOCKER", { priority: { name: "Blocker" } }),
				issue("HIGH", { priority: { name: "High" } }),
			]),
		).toEqual([
			["OVERDUE", "overdue", "now", "Overdue by 2 days"],
			["YESTERDAY", "overdue", "now", "Overdue by 1 day"],
			["TODAY", "due_today", "today", "Due today"],
			["BLOCKER", "high_priority", "today", "Blocker priority"],
			["HIGH", "high_priority", "soon", "High priority"],
		]);
	});

	it("skips normal issues, future due dates and unknown priorities", () => {
		expect(
			run([
				issue("MEDIUM", { priority: { name: "Medium" } }),
				issue("FUTURE", { duedate: "2026-01-06" }),
				issue("CUSTOM", { priority: { name: "P0 - Fire" } }),
				issue("NONE", { priority: null }),
			]),
		).toEqual([]);
	});

	it("links to the issue and includes key, project and status", () => {
		const [item] = issuesToAttention(
			[
				issue("WEB-1", {
					duedate: "2026-01-05",
					project: { key: "WEB", name: "Website" },
				}),
			],
			SITE,
			NOW,
		);
		expect(item).toMatchObject({
			url: "https://acme.atlassian.net/browse/WEB-1",
			context: "WEB-1 · Website · In Progress",
		});
	});

	it("flags only unreleased versions tagged overdue", () => {
		const release = (id: string, extra: Partial<Release>): Release => ({
			id,
			source: "jira",
			name: id,
			url: "#",
			project: "Website",
			state: "upcoming",
			tags: [],
			...extra,
		});
		const items = overdueReleasesToAttention(
			[
				release("late", { tags: ["Overdue"], date: "2026-01-01" }),
				release("on-time", { date: "2026-02-01" }),
				release("shipped", { state: "released", tags: ["Overdue"] }),
			],
			NOW,
		);
		expect(items.map((i) => [i.title, i.urgency, i.reason])).toEqual([
			["late", "today", "overdue_release"],
		]);
	});
});
