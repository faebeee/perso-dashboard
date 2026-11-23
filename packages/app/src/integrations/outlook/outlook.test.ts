import { fakeFetch } from "@dashboard/platform/testing/fake-fetch";
import { describe, expect, it } from "vitest";
import { createOutlookApi } from "./api/client";
import type { GraphMessage } from "./api/schemas";
import { withPeopleSearch } from "./constants";
import { toWorkItem } from "./mapper";
import { toEmailDetail } from "./message";
import { createOutlookService } from "./service";
import { latestPerConversation, unansweredToWaiting } from "./waiting";

const NOW = new Date("2026-01-10T12:00:00Z");
const daysAgo = (d: number) =>
	new Date(NOW.getTime() - d * 86_400_000).toISOString();

const message = (extra: Partial<GraphMessage> = {}): GraphMessage => ({
	id: "m1",
	conversationId: "c1",
	subject: "Budget 2026",
	bodyPreview: "Hi,\r\n  here are   the numbers",
	from: { emailAddress: { name: "Jane Doe", address: "jane@acme.ch" } },
	toRecipients: [{ emailAddress: { name: "Me", address: "me@acme.ch" } }],
	receivedDateTime: "2026-01-09T08:00:00Z",
	importance: "normal",
	isRead: false,
	webLink: "https://outlook.office365.com/owa/?ItemID=m1",
	...extra,
});

describe("outlook mapper", () => {
	it("maps a message to a work item", () => {
		expect(toWorkItem(message({ importance: "high" }))).toMatchObject({
			id: "outlook:m1",
			source: "outlook",
			kind: "email",
			title: "Budget 2026",
			url: "https://outlook.office365.com/owa/?ItemID=m1",
			updatedAt: "2026-01-09T08:00:00.000Z",
			context: "Hi, here are the numbers",
			actor: { name: "Jane Doe" },
			tags: ["Important"],
			detailRef: "m1",
		});
	});

	it("copes with missing subject and sender", () => {
		const item = toWorkItem(message({ subject: null, from: null }));
		expect(item.title).toBe("(no subject)");
		expect(item.actor?.name).toBe("Unknown sender");
	});

	it("builds the detail view, converting plain text and hiding inline images", () => {
		const detail = toEmailDetail(
			message({
				body: { contentType: "text", content: "Line <1>" },
				ccRecipients: [{ emailAddress: { address: "cc@acme.ch" } }],
			}),
			{
				value: [
					{ name: "a.pdf", contentType: "application/pdf", size: 10 },
					{
						name: "logo.png",
						contentType: "image/png",
						size: 5,
						isInline: true,
					},
				],
			},
		);
		expect(detail.html).toContain("Line &lt;1&gt;");
		expect(detail.cc).toEqual([{ name: "cc@acme.ch", email: "cc@acme.ch" }]);
		expect(detail.unread).toBe(true);
		expect(detail.attachments.map((a) => a.filename)).toEqual(["a.pdf"]);
	});

	it("searches mail with any of the people", () => {
		expect(withPeopleSearch(["a@x.ch", "b@y.ch"])).toBe(
			'"participants:a@x.ch OR participants:b@y.ch"',
		);
	});
});

describe("outlook waiting", () => {
	const sent = (id: string, conversationId: string, at: string) =>
		message({
			id,
			conversationId,
			from: { emailAddress: { address: "me@acme.ch" } },
			toRecipients: [
				{ emailAddress: { name: "Jane", address: "jane@acme.ch" } },
			],
			sentDateTime: at,
			receivedDateTime: at,
		});

	it("keeps the newest sent message per conversation", () => {
		expect(
			latestPerConversation([
				sent("new", "c1", daysAgo(3)),
				sent("old", "c1", daysAgo(5)),
				sent("other", "c2", daysAgo(4)),
			]).map((m) => m.id),
		).toEqual(["new", "other"]);
	});

	it("lists conversations nobody answered, oldest first", () => {
		const items = unansweredToWaiting(
			[
				// Answered by Jane after you wrote.
				{
					sent: sent("s1", "c1", daysAgo(4)),
					conversation: {
						value: [
							{
								id: "r1",
								from: { emailAddress: { address: "jane@acme.ch" } },
								receivedDateTime: daysAgo(3),
							},
						],
					},
				},
				// Only your own follow-ups: still waiting.
				{
					sent: sent("s2", "c2", daysAgo(5)),
					conversation: {
						value: [
							{
								id: "f1",
								from: { emailAddress: { address: "ME@acme.ch" } },
								receivedDateTime: daysAgo(4),
							},
						],
					},
				},
				{ sent: sent("s3", "c3", daysAgo(3)), conversation: { value: [] } },
				// Too recent to count as waiting.
				{ sent: sent("s4", "c4", daysAgo(0.5)), conversation: { value: [] } },
			],
			"me@acme.ch",
			NOW,
		);
		expect(items.map((i) => [i.id, i.context])).toEqual([
			["outlook:c2:waiting", "To Jane"],
			["outlook:c3:waiting", "To Jane"],
		]);
	});

	it("skips notes to yourself", () => {
		const note = message({
			id: "n",
			sentDateTime: daysAgo(4),
			toRecipients: [{ emailAddress: { address: "me@acme.ch" } }],
		});
		expect(
			unansweredToWaiting(
				[{ sent: note, conversation: { value: [] } }],
				"me@acme.ch",
				NOW,
			),
		).toEqual([]);
	});
});

describe("outlook service", () => {
	it("filters the inbox by date first (Graph requires it for sorting)", async () => {
		const fetch = fakeFetch({
			"/v1.0/me/mailFolders/inbox/messages": { value: [message()] },
		});
		const items = await createOutlookService(
			createOutlookApi("t", fetch),
			() => NOW,
		).unreadInbox();
		expect(items).toHaveLength(1);
		const url = new URL(String(fetch.mock.calls[0]?.[0]));
		expect(url.searchParams.get("$filter")).toBe(
			"receivedDateTime ge 1970-01-01T00:00:00.000Z and isRead eq false",
		);
		expect(url.searchParams.get("$orderby")).toBe("receivedDateTime desc");
	});

	it("reads exact weekly counts", async () => {
		const fetch = fakeFetch({
			"/v1.0/me/mailFolders/sentitems/messages": {
				value: [message()],
				"@odata.count": 42,
			},
		});
		const count = await createOutlookService(
			createOutlookApi("t", fetch),
		).countBetween("sentitems", new Date(daysAgo(7)), NOW);
		expect(count).toBe(42);
		const url = new URL(String(fetch.mock.calls[0]?.[0]));
		expect(url.searchParams.get("$count")).toBe("true");
		expect(url.searchParams.get("$filter")).toContain("sentDateTime lt");
	});

	it("finds unanswered mail across sent items and conversations", async () => {
		const fetch = fakeFetch({
			"/v1.0/me/mailFolders/sentitems/messages": {
				value: [
					message({
						id: "s1",
						conversationId: "c'1",
						sentDateTime: daysAgo(3),
						from: { emailAddress: { address: "me@acme.ch" } },
					}),
				],
			},
			"/v1.0/me/messages": { value: [] },
		});
		const conversations = await createOutlookService(
			createOutlookApi("t", fetch),
			() => NOW,
		).recentlySent();
		expect(conversations).toHaveLength(1);
		const conversationUrl = new URL(String(fetch.mock.calls[1]?.[0]));
		// Quotes in ids are escaped for OData.
		expect(conversationUrl.searchParams.get("$filter")).toBe(
			"conversationId eq 'c''1'",
		);
	});
});
