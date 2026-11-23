import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "#/core/calendar-event";
import type { GitHubSearchItem } from "./github/api/schemas";
import { awaitingReviewToWaiting } from "./github/waiting";
import type { GmailThread } from "./gmail/api/schemas";
import { withPeopleQuery } from "./gmail/constants";
import { unansweredToWaiting } from "./gmail/waiting";
import type { JiraIssue } from "./jira/api/schemas";
import { unassignedToWaiting } from "./jira/waiting";
import { pendingRepliesToWaiting } from "./shared/calendar-waiting";

const NOW = new Date("2026-01-10T12:00:00Z");
const daysAgo = (d: number) =>
	new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("github: PRs awaiting review", () => {
	const pr = (id: number, created: string): GitHubSearchItem => ({
		id,
		number: id,
		title: `PR ${id}`,
		html_url: `https://github.com/acme/web/pull/${id}`,
		updated_at: NOW.toISOString(),
		created_at: created,
		state: "open",
		repository_url: "https://api.github.com/repos/acme/web",
		user: null,
		labels: [],
	});
	it("lists oldest first with how long they've waited", () => {
		const items = awaitingReviewToWaiting(
			[pr(1, daysAgo(1)), pr(2, daysAgo(4))],
			NOW,
		);
		expect(items.map((i) => [i.title, i.label, i.reason])).toEqual([
			["PR 2", "No review for 4 days", "awaiting_review"],
			["PR 1", "No review for 24 hours", "awaiting_review"],
		]);
	});
});

describe("jira: reported issues nobody picked up", () => {
	it("uses the creation date and keeps the detail ref", () => {
		const issue: JiraIssue = {
			id: "1",
			key: "WEB-1",
			fields: {
				summary: "Broken login",
				updated: NOW.toISOString(),
				created: daysAgo(5),
				status: { name: "Open" },
			},
		};
		const [item] = unassignedToWaiting(
			[issue],
			"https://acme.atlassian.net",
			NOW,
		);
		expect(item).toMatchObject({
			reason: "unassigned",
			label: "Unassigned for 5 days",
			context: "WEB-1 · Open",
			detailRef: "WEB-1",
			url: "https://acme.atlassian.net/browse/WEB-1",
		});
	});
});

describe("calendar: invitations without replies", () => {
	const event = (extra: Partial<CalendarEvent>): CalendarEvent => ({
		id: "e",
		source: "google-calendar",
		title: "Planning",
		url: "#",
		start: "2026-01-12T09:00:00Z",
		end: "2026-01-12T10:00:00Z",
		allDay: false,
		isOrganizer: true,
		...extra,
	});
	it("counts pending invitees on meetings you organize only", () => {
		const items = pendingRepliesToWaiting([
			event({
				attendees: [
					{ email: "a@x.com", name: "Ann", response: "needsAction" },
					{ email: "b@x.com", response: "accepted" },
				],
			}),
			event({
				id: "nobody",
				attendees: [{ email: "c@x.com", response: "needsAction" }],
			}),
			event({
				id: "invited",
				isOrganizer: false,
				attendees: [{ email: "d@x.com", response: "needsAction" }],
			}),
			event({
				id: "all-replied",
				attendees: [{ email: "e@x.com", response: "declined" }],
			}),
		]);
		expect(items.map((i) => [i.label, i.context])).toEqual([
			["1 of 2 haven't replied", "Ann"],
			["Nobody replied yet (1)", "c@x.com"],
		]);
	});
});

describe("gmail: conversations without a reply", () => {
	const thread = (
		id: string,
		last: { sent: boolean; daysAgo: number; to?: string },
	): GmailThread => ({
		id,
		messages: [
			{
				id: `${id}-m`,
				threadId: id,
				snippet: "",
				internalDate: String(NOW.getTime() - last.daysAgo * 86_400_000),
				labelIds: last.sent ? ["SENT"] : ["INBOX"],
				payload: {
					headers: [
						{ name: "Subject", value: `Re: ${id}` },
						{ name: "To", value: last.to ?? '"Bob Smith" <bob@x.com>' },
					],
				},
			},
		],
	});
	it("keeps threads where you wrote last, long enough ago, not to yourself", () => {
		const items = unansweredToWaiting(
			[
				thread("waiting", { sent: true, daysAgo: 3 }),
				thread("too-fresh", { sent: true, daysAgo: 1 }),
				thread("answered", { sent: false, daysAgo: 5 }),
				thread("note-to-self", { sent: true, daysAgo: 4, to: "me@x.com" }),
			],
			"me@x.com",
			NOW,
		);
		expect(
			items.map((i) => [i.title, i.label, i.context, i.detailRef]),
		).toEqual([
			["Re: waiting", "No reply for 3 days", "To Bob Smith", "waiting-m"],
		]);
	});

	it("searches mail with any of the people since a date", () => {
		expect(withPeopleQuery(["a@x.com", "b@y.com"], new Date(2026, 0, 3))).toBe(
			"{from:a@x.com to:a@x.com cc:a@x.com from:b@y.com to:b@y.com cc:b@y.com} after:2026/1/3 -in:chats",
		);
	});
});
