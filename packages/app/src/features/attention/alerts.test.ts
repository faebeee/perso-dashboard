import type { AttentionItem } from "@dashboard/core/attention";
import { describe, expect, it } from "vitest";
import { selectAlerts } from "./alerts";

const item = (
	id: string,
	urgency: AttentionItem["urgency"],
): AttentionItem => ({
	id,
	source: "x",
	reason: "meeting",
	urgency,
	title: id,
	url: "#",
	at: "2026-01-01T00:00:00Z",
	label: "",
});

const ids = (items: AttentionItem[]) => items.map((i) => i.id);

describe("selectAlerts", () => {
	it("only alerts 'now' items on the first run", () => {
		const { alerts } = selectAlerts(
			[item("a", "now"), item("b", "today"), item("c", "soon")],
			null,
		);
		expect(ids(alerts)).toEqual(["a"]);
	});

	it("alerts new 'now' and 'today' items once, never 'soon'", () => {
		const first = selectAlerts([item("a", "today")], null);
		const second = selectAlerts(
			[item("a", "today"), item("b", "today"), item("c", "soon")],
			first.seen,
		);
		expect(ids(second.alerts)).toEqual(["b"]);
		const third = selectAlerts(
			[item("a", "today"), item("b", "today")],
			second.seen,
		);
		expect(third.alerts).toEqual([]);
	});

	it("alerts again when an item escalates", () => {
		const before = selectAlerts([item("meeting", "today")], null);
		const after = selectAlerts([item("meeting", "now")], before.seen);
		expect(ids(after.alerts)).toEqual(["meeting"]);
	});

	it("forgets items that left the list", () => {
		const { seen } = selectAlerts([item("a", "now")], null);
		expect([...selectAlerts([], seen).seen]).toEqual([]);
	});
});
