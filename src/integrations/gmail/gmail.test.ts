import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { createGmailApi } from "./api/client";
import { gmailMessageSchema } from "./api/schemas";
import { decodeEntities, senderName, toWorkItem } from "./mapper";
import { createGmailService } from "./service";

const message = (id: string, overrides: Record<string, unknown> = {}) => ({
	id,
	threadId: `thread-${id}`,
	snippet: "Let&#39;s meet &amp; talk",
	internalDate: "1767312000000", // 2026-01-02T00:00:00Z
	labelIds: ["INBOX", "UNREAD", "IMPORTANT"],
	payload: {
		headers: [
			{ name: "From", value: '"Grace Hopper" <grace@navy.mil>' },
			{ name: "Subject", value: "Compiler review" },
		],
	},
	...overrides,
});

describe("gmail mapper", () => {
	it("maps message metadata to a WorkItem", () => {
		expect(
			toWorkItem(gmailMessageSchema.parse(message("m1")), "me@x.com"),
		).toEqual({
			id: "gmail:m1",
			source: "gmail",
			kind: "email",
			title: "Compiler review",
			url: "https://mail.google.com/mail/u/me%40x.com/#inbox/thread-m1",
			updatedAt: "2026-01-02T00:00:00.000Z",
			context: "Let's meet & talk",
			actor: { name: "Grace Hopper" },
			tags: ["Important"],
		});
	});

	it("falls back for missing subjects", () => {
		const parsed = gmailMessageSchema.parse(
			message("m2", { payload: { headers: [] } }),
		);
		expect(toWorkItem(parsed).title).toBe("(no subject)");
	});

	it.each([
		['"Jane Doe" <jane@x.com>', "Jane Doe"],
		["Jane Doe <jane@x.com>", "Jane Doe"],
		["<jane@x.com>", "jane@x.com"],
		["jane@x.com", "jane@x.com"],
	])("parses sender %s", (from, expected) => {
		expect(senderName(from)).toBe(expected);
	});

	it("decodes HTML entities in snippets", () => {
		expect(decodeEntities("a &lt;b&gt; &quot;c&quot; &#8217;")).toBe(
			'a <b> "c" ’',
		);
	});
});

describe("gmail service", () => {
	it("lists unread messages and fetches metadata for each", async () => {
		const fetch = fakeFetch({
			"/gmail/v1/users/me/messages": {
				messages: [
					{ id: "m1", threadId: "t1" },
					{ id: "m2", threadId: "t2" },
				],
			},
			"/gmail/v1/users/me/messages/*": (url: URL) =>
				message(url.pathname.split("/").pop() ?? ""),
		});
		const items = await createGmailService(
			createGmailApi("t", fetch),
		).unreadInbox();

		expect(items.map((i) => i.id)).toEqual(["gmail:m1", "gmail:m2"]);
		expect(fetch).toHaveBeenCalledTimes(3);
		const detailUrl = new URL(String(fetch.mock.calls[1]?.[0]));
		expect(detailUrl.searchParams.getAll("metadataHeaders")).toEqual([
			"From",
			"Subject",
		]);
	});

	it("handles an empty inbox", async () => {
		const fetch = fakeFetch({
			"/gmail/v1/users/me/messages": { resultSizeEstimate: 0 },
		});
		await expect(
			createGmailService(createGmailApi("t", fetch)).unreadInbox(),
		).resolves.toEqual([]);
	});
});
