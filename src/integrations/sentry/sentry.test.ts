import { describe, expect, it } from "vitest";
import { fakeFetch } from "#/test/fake-fetch";
import { createSentryApi, safeRegionUrl } from "./api/client";
import type { SentryIssue } from "./api/schemas";
import { issuesToAttention } from "./attention";
import { SENTRY_QUERIES } from "./constants";
import { compactCount, toWorkItem } from "./mapper";
import {
	accountLabel,
	createSentryService,
	readSentryMeta,
	resolveSentryAccount,
} from "./service";

const issue = (id: string, extra: Partial<SentryIssue> = {}): SentryIssue => ({
	id,
	shortId: `WEB-${id}`,
	title: `TypeError ${id}`,
	culprit: "checkout/pay",
	permalink: `https://acme.sentry.io/issues/${id}/`,
	level: "error",
	status: "unresolved",
	substatus: "ongoing",
	count: "1520",
	userCount: 42,
	firstSeen: "2026-01-01T10:00:00Z",
	lastSeen: "2026-01-05T10:00:00Z",
	project: { slug: "web", name: "Web" },
	assignedTo: { type: "user", name: "Ada" },
	...extra,
});

describe("safeRegionUrl", () => {
	it.each([
		["https://de.sentry.io", "https://de.sentry.io"],
		["https://us.sentry.io/", "https://us.sentry.io"],
		["https://sentry.io", "https://sentry.io"],
		[undefined, "https://sentry.io"],
		// Never send the token anywhere else.
		["https://evil.example.com", "https://sentry.io"],
		["https://sentry.io.evil.com", "https://sentry.io"],
		["http://de.sentry.io", "https://sentry.io"],
		["not a url", "https://sentry.io"],
	])("%s → %s", (input, expected) => {
		expect(safeRegionUrl(input)).toBe(expected);
	});
});

describe("sentry mapper", () => {
	it("maps an issue to an error WorkItem", () => {
		expect(toWorkItem(issue("1", { substatus: "escalating" }))).toEqual({
			id: "sentry:1",
			source: "sentry",
			kind: "error",
			title: "TypeError 1",
			url: "https://acme.sentry.io/issues/1/",
			updatedAt: "2026-01-05T10:00:00.000Z",
			context: "WEB-1 · checkout/pay",
			project: "Web",
			status: "Escalating",
			assignee: { name: "Ada" },
			tags: ["Error", "1.5K events", "42 users"],
		});
	});

	it("marks unassigned issues and formats huge counts", () => {
		expect(toWorkItem(issue("2", { assignedTo: null })).assignee).toBeNull();
		expect(compactCount("999")).toBe("999");
		expect(compactCount("1234567")).toBe("1.2M");
		expect(compactCount("n/a")).toBe("n/a");
	});
});

describe("sentry attention", () => {
	it("flags escalating, regressed and fatal issues today; new ones of yours soon", () => {
		const items = issuesToAttention([
			issue("esc", { substatus: "escalating" }),
			issue("reg", {
				substatus: "regressed",
				assignedTo: { type: "team", name: "backend" },
			}),
			issue("fatal", { level: "fatal" }),
			issue("new-mine", { substatus: "new" }),
			issue("new-team", {
				substatus: "new",
				assignedTo: { type: "team", name: "backend" },
			}),
			issue("ongoing"),
		]);
		expect(items.map((i) => [i.title, i.urgency, i.label])).toEqual([
			["TypeError esc", "today", "Escalating · 1.5K events"],
			["TypeError reg", "today", "Regressed · 1.5K events · #backend"],
			["TypeError fatal", "today", "Fatal · 1.5K events"],
			["TypeError new-mine", "soon", "New error · 1.5K events"],
		]);
		expect(items[0]).toMatchObject({
			reason: "production_error",
			context: "WEB-esc · Web",
		});
	});
});

describe("sentry service", () => {
	const orgs = [
		{ slug: "acme", name: "Acme", apiUrl: "https://de.sentry.io" },
		{ slug: "side", name: "Side", apiUrl: "https://us.sentry.io" },
	];

	it("searches every org on its region host and merges in order", async () => {
		const fetch = fakeFetch({
			"/api/0/organizations/acme/issues/": [
				issue("a", { lastSeen: "2026-01-03T00:00:00Z" }),
			],
			"/api/0/organizations/side/issues/": [
				issue("b", { lastSeen: "2026-01-04T00:00:00Z" }),
			],
		});
		const items = await createSentryService(
			createSentryApi("token", fetch),
			orgs,
		).assigned();

		expect(items.map((i) => i.id)).toEqual(["sentry:b", "sentry:a"]);
		const urls = fetch.mock.calls.map((c) => new URL(String(c[0])));
		expect(urls.map((u) => u.host).sort()).toEqual([
			"de.sentry.io",
			"us.sentry.io",
		]);
		expect(urls[0]?.searchParams.get("query")).toBe(SENTRY_QUERIES.assigned);
	});

	it("sorts escalating issues by event volume across orgs", async () => {
		const fetch = fakeFetch({
			"/api/0/organizations/acme/issues/": [issue("small", { count: "10" })],
			"/api/0/organizations/side/issues/": [issue("big", { count: "9000" })],
		});
		const items = await createSentryService(
			createSentryApi("token", fetch),
			orgs,
		).escalating();
		expect(items.map((i) => i.title)).toEqual([
			"TypeError big",
			"TypeError small",
		]);
		expect(
			new URL(String(fetch.mock.calls[0]?.[0])).searchParams.get("sort"),
		).toBe("freq");
	});

	it("still returns other orgs when one fails", async () => {
		const fetch = fakeFetch({
			"/api/0/organizations/side/issues/": [issue("b")],
		}); // acme → 404
		const items = await createSentryService(
			createSentryApi("token", fetch),
			orgs,
		).assigned();
		expect(items.map((i) => i.id)).toEqual(["sentry:b"]);
	});

	it("captures organizations with safe region URLs at connect time", async () => {
		const fetch = fakeFetch({
			"/api/0/organizations/": [
				{
					slug: "acme",
					name: "Acme",
					links: { regionUrl: "https://de.sentry.io" },
				},
				{
					slug: "x",
					name: "X",
					links: { regionUrl: "https://evil.example.com" },
				},
			],
		});
		const meta = await resolveSentryAccount(createSentryApi("token", fetch));
		expect(meta.organizations).toEqual([
			{ slug: "acme", name: "Acme", apiUrl: "https://de.sentry.io" },
			{ slug: "x", name: "X", apiUrl: "https://sentry.io" },
		]);
		expect(accountLabel(meta)).toBe("Acme +1");
	});

	it("asks for a reconnect when the stored organizations are missing", () => {
		expect(() => readSentryMeta({})).toThrow(/Reconnect Sentry/);
	});
});
