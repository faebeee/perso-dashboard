import { describe, expect, it } from "vitest";
import type { AttentionItem } from "./attention";
import {
	applyDismissals,
	attentionFingerprint,
	type Dismissal,
	snoozeUntil,
} from "./dismissal";

const item = (
	id: string,
	urgency: AttentionItem["urgency"] = "today",
	label = "",
): AttentionItem => ({
	id,
	source: "x",
	reason: "meeting",
	urgency,
	title: id,
	url: "#",
	at: "2026-01-01T00:00:00Z",
	label,
});

const NOW = new Date(2026, 0, 7, 10, 0); // Wednesday 10:00 local
const ids = (items: AttentionItem[]) => items.map((i) => i.id);

describe("applyDismissals", () => {
	it("hides done items until they escalate, ignoring label changes", () => {
		const done: Dismissal = {
			itemId: "m",
			mode: "done",
			until: null,
			fingerprint: attentionFingerprint(item("m", "today")),
		};
		expect(
			ids(
				applyDismissals([item("m", "today", "Starts in 1h")], [done], NOW)
					.visible,
			),
		).toEqual([]);
		const escalated = applyDismissals([item("m", "now")], [done], NOW);
		expect(ids(escalated.visible)).toEqual(["m"]);
		expect(escalated.hidden).toEqual([]);
	});

	it("hides snoozed items until the snooze ends", () => {
		const snooze = (until: Date): Dismissal => ({
			itemId: "s",
			mode: "snoozed",
			until,
			fingerprint: "",
		});
		const later = applyDismissals(
			[item("s"), item("other")],
			[snooze(new Date(NOW.getTime() + 1))],
			NOW,
		);
		expect(ids(later.visible)).toEqual(["other"]);
		expect(later.hidden.map((h) => h.item.id)).toEqual(["s"]);
		expect(
			ids(applyDismissals([item("s")], [snooze(NOW)], NOW).visible),
		).toEqual(["s"]);
	});
});

describe("snoozeUntil", () => {
	const nine = 9 * 60;
	it.each([
		["1h", new Date(2026, 0, 7, 11, 0)],
		["3h", new Date(2026, 0, 7, 13, 0)],
		["tomorrow", new Date(2026, 0, 8, 9, 0)],
		["next_week", new Date(2026, 0, 12, 9, 0)],
	] as const)("%s", (option, expected) => {
		expect(snoozeUntil(option, NOW, nine)).toEqual(expected);
	});

	it("goes to the following Monday when it's Monday already", () => {
		const monday = new Date(2026, 0, 12, 8, 0);
		expect(snoozeUntil("next_week", monday, 8 * 60 + 30)).toEqual(
			new Date(2026, 0, 19, 8, 30),
		);
	});
});
