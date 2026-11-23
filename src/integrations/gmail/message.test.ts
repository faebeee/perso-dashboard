import { describe, expect, it } from "vitest";
import { textToHtml } from "#/lib/text-to-html";
import { toBase64Url } from "#/platform/encoding";
import type { GmailFullMessage, GmailPart } from "./api/schemas";
import { parseAddressList, toEmailDetail } from "./message";

const utf8 = (text: string) => toBase64Url(new TextEncoder().encode(text));

const part = (mimeType: string, extra: Partial<GmailPart> = {}): GmailPart => ({
	mimeType,
	filename: "",
	headers: [],
	body: { size: 0 },
	parts: [],
	...extra,
});

const message = (
	payload: GmailPart,
	labelIds: string[] = [],
): GmailFullMessage => ({
	id: "m1",
	threadId: "t1",
	snippet: "",
	internalDate: "1767312000000",
	labelIds,
	payload: {
		...payload,
		headers: [
			{ name: "Subject", value: "Quarterly report" },
			{ name: "From", value: '"Grace Hopper" <grace@navy.mil>' },
			{ name: "To", value: '"Doe, Jane" <jane@x.com>, bob@x.com' },
			{ name: "Date", value: "Fri, 02 Jan 2026 10:00:00 +0000" },
			...payload.headers,
		],
	},
});

describe("toEmailDetail", () => {
	it("prefers the HTML part of a multipart/alternative message", () => {
		const detail = toEmailDetail(
			message(
				part("multipart/alternative", {
					parts: [
						part("text/plain", { body: { size: 5, data: utf8("plain") } }),
						part("text/html", {
							body: { size: 9, data: utf8("<b>hi</b> ✓") },
						}),
					],
				}),
				["IMPORTANT", "UNREAD"],
			),
			"me@x.com",
		);
		expect(detail).toMatchObject({
			subject: "Quarterly report",
			from: { name: "Grace Hopper", email: "grace@navy.mil" },
			to: [
				{ name: "Doe, Jane", email: "jane@x.com" },
				{ name: "bob@x.com", email: "bob@x.com" },
			],
			date: "2026-01-02T10:00:00.000Z",
			html: "<b>hi</b> ✓",
			important: true,
			unread: true,
			url: "https://mail.google.com/mail/?authuser=me%40x.com#all/t1",
		});
	});

	it("finds bodies in nested multipart/mixed and lists attachments", () => {
		const detail = toEmailDetail(
			message(
				part("multipart/mixed", {
					parts: [
						part("multipart/alternative", {
							parts: [
								part("text/html", {
									body: { size: 4, data: utf8("<p>x</p>") },
								}),
							],
						}),
						part("application/pdf", {
							filename: "report.pdf",
							body: { size: 2048, attachmentId: "a1" },
						}),
					],
				}),
			),
		);
		expect(detail.html).toBe("<p>x</p>");
		expect(detail.attachments).toEqual([
			{ filename: "report.pdf", mimeType: "application/pdf", size: 2048 },
		]);
	});

	it("decodes the declared charset", () => {
		const latin1 = toBase64Url(new Uint8Array([0x47, 0x72, 0xfc, 0xdf, 0x65])); // "Grüße"
		const detail = toEmailDetail(
			message(
				part("text/plain", {
					headers: [
						{ name: "Content-Type", value: 'text/plain; charset="ISO-8859-1"' },
					],
					body: { size: 5, data: latin1 },
				}),
			),
		);
		expect(detail.html).toContain("Grüße");
	});

	it("converts plain-text mail into escaped HTML and flags remote images", () => {
		const plain = toEmailDetail(
			message(
				part("text/plain", { body: { size: 1, data: utf8("<script>") } }),
			),
		);
		expect(plain.html).not.toContain("<script>");
		expect(plain.hasRemoteImages).toBe(false);

		const tracked = toEmailDetail(
			message(
				part("text/html", {
					body: { size: 1, data: utf8('<img src="https://t.co/pixel.gif">') },
				}),
			),
		);
		expect(tracked.hasRemoteImages).toBe(true);
	});
});

describe("parseAddressList", () => {
	it("handles quoted commas and bare addresses", () => {
		expect(parseAddressList('"Last, First" <a@x.com>, b@y.com')).toEqual([
			{ name: "Last, First", email: "a@x.com" },
			{ name: "b@y.com", email: "b@y.com" },
		]);
		expect(parseAddressList(undefined)).toEqual([]);
	});
});

describe("textToHtml", () => {
	it("escapes markup and links URLs without trailing punctuation", () => {
		expect(textToHtml("See <b> https://x.com/a?b=1.")).toBe(
			'<div style="white-space:pre-wrap">See &lt;b&gt; <a href="https://x.com/a?b=1">https://x.com/a?b=1</a>.</div>',
		);
	});
});
