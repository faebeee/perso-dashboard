import { describe, expect, it } from "vitest";
import type { WorkItem } from "#/core/work-item";
import { prSignalsToAttention, reviewRequestsToAttention } from "./attention";

const NOW = new Date("2026-01-05T12:00:00Z");
const pr = (id: string, updatedAt: string): WorkItem => ({
	id: `github:review_request:${id}`,
	source: "github",
	kind: "review_request",
	title: id,
	url: `https://github.com/acme/web/pull/${id}`,
	updatedAt,
	context: `acme/web #${id}`,
});

describe("github attention", () => {
	it("escalates review requests idle for more than a day", () => {
		const [fresh, stale] = reviewRequestsToAttention(
			[pr("1", "2026-01-05T10:00:00Z"), pr("2", "2026-01-03T12:00:00Z")],
			NOW,
		);
		expect(fresh).toMatchObject({
			reason: "review_requested",
			urgency: "soon",
			label: "Review requested",
			context: "acme/web #1",
		});
		expect(stale).toMatchObject({
			urgency: "today",
			label: "Review waiting since 2 days ago",
		});
	});
});

describe("github PR signals", () => {
	it("flags your PRs needing changes or with failing checks as today", () => {
		const ownPr = (id: string, updatedAt: string) => ({
			...pr(id, updatedAt),
			kind: "pull_request" as const,
			id: `github:pull_request:${id}`,
		});
		const items = prSignalsToAttention([
			{ item: ownPr("1", "2026-01-05T10:00:00Z"), signals: ["checks_failing"] },
			{
				item: ownPr("2", "2026-01-04T10:00:00Z"),
				signals: ["changes_requested", "checks_failing"],
			},
		]);
		expect(items.map((i) => [i.reason, i.urgency, i.label])).toEqual([
			["checks_failing", "today", "Checks failing"],
			["changes_requested", "today", "Changes requested · Checks failing"],
		]);
		// Own id suffix: never collides with the PR's other attention items.
		expect(items[0]?.id).toBe("github:pull_request:1:signals");
	});
});
