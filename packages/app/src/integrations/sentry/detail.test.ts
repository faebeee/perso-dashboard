import { describe, expect, it } from "vitest";
import type { SentryEvent, SentryIssue } from "./api/schemas";
import { toErrorDetail } from "./detail";

const issue: SentryIssue = {
	id: "1",
	shortId: "WEB-1",
	title: "TypeError: x is undefined",
	culprit: "checkout/pay",
	permalink: "https://acme.sentry.io/issues/1/",
	level: "error",
	status: "unresolved",
	substatus: "escalating",
	count: "1520",
	userCount: 42,
	firstSeen: "2026-01-01T10:00:00Z",
	lastSeen: "2026-01-05T10:00:00Z",
	project: { slug: "web", name: "Web" },
	assignedTo: { type: "team", name: "frontend" },
};

const event: SentryEvent = {
	eventID: "e1",
	dateCreated: "2026-01-05T10:00:00Z",
	tags: [
		{ key: "zeta", value: "z" },
		{ key: "release", value: "1.2.3" },
		{ key: "environment", value: "production" },
	],
	user: { email: "ada@x.com" },
	entries: [
		{
			type: "exception",
			data: {
				values: [
					{
						type: "NetworkError",
						value: "fetch failed",
						stacktrace: { frames: [] },
					},
					{
						type: "TypeError",
						value: "x is undefined",
						mechanism: { handled: false },
						stacktrace: {
							frames: [
								{
									function: "main",
									filename: "app.js",
									lineNo: 1,
									inApp: true,
									context: [],
								},
								{
									function: "react",
									filename: "node_modules/react.js",
									lineNo: 9,
									inApp: false,
									context: [[9, "lib"]],
								},
								{
									function: "pay",
									filename: "checkout.ts",
									lineNo: 12,
									colNo: 4,
									inApp: true,
									context: [
										[11, "const x = get();"],
										[12, "x.total();"],
									],
								},
							],
						},
					},
				],
			},
		},
	],
};

describe("toErrorDetail", () => {
	const detail = toErrorDetail(issue, event);

	it("puts the raised exception and the crash site first", () => {
		expect(detail.latest?.exceptions.map((e) => e.type)).toEqual([
			"TypeError",
			"NetworkError",
		]);
		const [top, library, bottom] = detail.latest?.exceptions[0]?.frames ?? [];
		expect(top).toMatchObject({
			function: "pay",
			file: "checkout.ts",
			line: 12,
			inApp: true,
		});
		expect(top?.context).toEqual([
			{ line: 11, code: "const x = get();", current: false },
			{ line: 12, code: "x.total();", current: true },
		]);
		expect(library).toMatchObject({ inApp: false, context: [] }); // library code not shown
		expect(bottom?.function).toBe("main");
		expect(detail.latest?.exceptions[0]?.handled).toBe(false);
	});

	it("summarises the issue and orders key tags first", () => {
		expect(detail).toMatchObject({
			events: 1520,
			users: 42,
			assignee: "#frontend",
			substatus: "escalating",
		});
		expect(detail.latest?.tags.map((t) => t.key)).toEqual([
			"environment",
			"release",
			"zeta",
		]);
		expect(detail.latest?.user).toBe("ada@x.com");
	});

	it("still works without a retained event", () => {
		expect(toErrorDetail(issue, null).latest).toBeUndefined();
	});
});
