import type { CalendarEvent } from "@dashboard/core/calendar-event";
import { describe, expect, it } from "vitest";
import { relatedQuery, ticketKeys } from "#/features/waiting/related-query";
import { relatedPrsQuery } from "#/integrations/github/service";
import { relatedKeysJql, relatedTextJql } from "#/integrations/jira/service";
import { meetingPrepPrompt } from "./prep-prompt";

const meeting = (title: string): CalendarEvent => ({
	id: "google-calendar:1",
	source: "google-calendar",
	title,
	url: "https://calendar.test/1",
	start: "2026-11-25T09:00:00.000Z",
	end: "2026-11-25T09:30:00.000Z",
	allDay: false,
	isOrganizer: false,
	attendees: [
		{ email: "ada@acme.test", name: "Ada" },
		{ email: "bob@acme.test" },
	],
});

const since = new Date("2026-11-11T00:00:00Z");

describe("related query", () => {
	it("takes keys, distinctive words and people from the meeting", () => {
		expect(
			relatedQuery(meeting("EMI-6012: Header redesign weekly sync"), since),
		).toEqual({
			people: ["ada@acme.test", "bob@acme.test"],
			keys: ["EMI-6012"],
			keywords: ["header", "redesign"],
			since,
		});
	});

	it("searches by people only for a generic title", () => {
		const query = relatedQuery(meeting("Weekly Sync / Jour fixe"), since);
		expect(query.keywords).toEqual([]);
		expect(query.keys).toEqual([]);
	});

	it("finds ticket keys once", () => {
		expect(ticketKeys("EMI-1 and EMI-1, ABC_D-22, not-a-key")).toEqual([
			"EMI-1",
			"ABC_D-22",
		]);
	});
});

describe("search queries", () => {
	it("builds Jira JQL for keys and quoted keywords", () => {
		expect(relatedKeysJql(["EMI-6012", "bad key"])).toBe(
			"issuekey in (EMI-6012) ORDER BY updated DESC",
		);
		expect(relatedKeysJql([])).toBeNull();
		expect(relatedTextJql(['say "hi"'], since)).toBe(
			'text ~ "say \\"hi\\"" AND updated >= "2026-11-11" ORDER BY updated DESC',
		);
		expect(relatedTextJql([], since)).toBeNull();
	});

	it("builds a GitHub search for PRs mentioning the keys", () => {
		expect(relatedPrsQuery(["EMI-1", "EMI-2"], since)).toBe(
			"is:pr involves:@me updated:>=2026-11-11 EMI-1 OR EMI-2",
		);
		expect(relatedPrsQuery([], since)).toBeNull();
	});
});

describe("prep prompt", () => {
	it("lists the meeting, attendees and related items", () => {
		const prompt = meetingPrepPrompt({
			meeting: meeting("Header redesign"),
			related: [
				{
					id: "jira:1",
					source: "jira",
					kind: "issue",
					title: "New header",
					url: "https://jira.test/EMI-6012",
					updatedAt: "2026-11-23T10:00:00.000Z",
					context: "EMI-6012",
					status: "In Progress",
				},
			],
		});
		expect(prompt).toContain("Header redesign");
		expect(prompt).toContain("- Ada <ada@acme.test>");
		expect(prompt).toContain(
			"- [jira issue] New header (EMI-6012) · In Progress · 2026-11-23",
		);
	});

	it("says when nothing related was found", () => {
		expect(
			meetingPrepPrompt({ meeting: meeting("Chat"), related: [] }),
		).toContain("- (none found)");
	});
});
