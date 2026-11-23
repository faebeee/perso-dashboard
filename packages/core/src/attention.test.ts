import { describe, expect, it } from "vitest";
import { type AttentionItem, rankAttention } from "./attention";

const item = (
	id: string,
	urgency: AttentionItem["urgency"],
	at: string,
): AttentionItem => ({
	id,
	source: "x",
	reason: "meeting",
	urgency,
	title: id,
	url: "#",
	at,
	label: "",
});

describe("rankAttention", () => {
	it("orders by urgency, then earliest first", () => {
		const ranked = rankAttention([
			item("soon", "soon", "2026-01-01T08:00:00Z"),
			item("today-late", "today", "2026-01-01T12:00:00Z"),
			item("now", "now", "2026-01-01T15:00:00Z"),
			item("today-early", "today", "2026-01-01T09:00:00Z"),
		]);
		expect(ranked.map((i) => i.id)).toEqual([
			"now",
			"today-early",
			"today-late",
			"soon",
		]);
	});
});
