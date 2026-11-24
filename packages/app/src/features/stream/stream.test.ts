import { describe, expect, it } from "vitest";
import {
	arrivals,
	STREAM_WINDOW_MS,
	type StreamEvent,
	streamEventId,
	visibleStream,
} from "./stream";

const NOW = Date.parse("2026-11-24T12:00:00Z");

const event = (
	itemId: string,
	at: string,
	extra: Partial<StreamEvent> = {},
): StreamEvent => ({
	id: streamEventId(itemId, at),
	itemId,
	source: "jira",
	kind: "issue",
	verb: "Ticket updated",
	title: itemId,
	url: `https://x/${itemId}`,
	at,
	...extra,
});

describe("visibleStream", () => {
	it("puts the newest on top", () => {
		const list = visibleStream(
			[event("a", "2026-11-24T09:00:00Z"), event("b", "2026-11-24T11:00:00Z")],
			new Set(),
			NOW,
		);
		expect(list.map((e) => e.itemId)).toEqual(["b", "a"]);
	});

	it("hides cleared entries but shows the next change of the same item", () => {
		const old = event("a", "2026-11-24T09:00:00Z");
		const next = event("a", "2026-11-24T10:00:00Z");
		expect(visibleStream([old], new Set([old.id]), NOW)).toEqual([]);
		expect(visibleStream([next], new Set([old.id]), NOW)).toEqual([next]);
	});

	it("drops the future and what is older than the window", () => {
		const list = visibleStream(
			[
				event("future", "2026-11-24T15:00:00Z"),
				event("old", new Date(NOW - STREAM_WINDOW_MS - 1000).toISOString()),
				event("bad", "not a date"),
				event("ok", "2026-11-24T11:59:00Z"),
			],
			new Set(),
			NOW,
		);
		expect(list.map((e) => e.itemId)).toEqual(["ok"]);
	});

	it("merges the same link in the same minute, keeping the first", () => {
		const list = visibleStream(
			[
				event("act", "2026-11-24T10:00:10Z", {
					url: "https://x/pr",
					verb: "You opened",
				}),
				event("feed", "2026-11-24T10:00:40Z", { url: "https://x/pr" }),
				event("act", "2026-11-24T10:00:10Z", { url: "https://x/pr" }),
			],
			new Set(),
			NOW,
		);
		expect(list).toHaveLength(1);
		expect(list[0]?.verb).toBe("You opened");
	});

	it("keeps at most the limit", () => {
		const many = Array.from({ length: 5 }, (_, i) =>
			event(`i${i}`, `2026-11-24T10:0${i}:00Z`),
		);
		expect(visibleStream(many, new Set(), NOW, 2).map((e) => e.itemId)).toEqual(
			["i4", "i3"],
		);
	});

	it("builds the same id for the same moment in any notation", () => {
		expect(streamEventId("a", "2026-11-24T10:00:00Z")).toBe(
			streamEventId("a", "2026-11-24T11:00:00+01:00"),
		);
	});
});

describe("arrivals", () => {
	it("finds nothing new on the first load, then only unknown ids", () => {
		const a = event("a", "2026-11-24T09:00:00Z");
		const b = event("b", "2026-11-24T10:00:00Z");
		expect(arrivals([a, b], null)).toEqual([]);
		expect(arrivals([a, b], new Set([a.id]))).toEqual([b.id]);
	});
});
