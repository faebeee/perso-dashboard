import { describe, expect, it } from "vitest";
import type { AttentionItem } from "#/core/attention";
import { IntegrationFailure } from "#/core/result";
import { aggregateAttention } from "./aggregate";

const item = (
	id: string,
	urgency: AttentionItem["urgency"],
): AttentionItem => ({
	id,
	source: "a",
	reason: "meeting",
	urgency,
	title: id,
	url: "#",
	at: "2026-01-01T00:00:00Z",
	label: "",
});

describe("aggregateAttention", () => {
	it("ranks items across sources and keeps going when one fails", async () => {
		const result = await aggregateAttention([
			{ id: "a", fetch: async () => [item("soon", "soon")] },
			{
				id: "b",
				fetch: async () => {
					throw new IntegrationFailure({
						kind: "rate_limited",
						message: "slow",
					});
				},
			},
			{ id: "c", fetch: async () => [item("now", "now")] },
		]);
		expect(result.items.map((i) => i.id)).toEqual(["now", "soon"]);
		expect(result.errors).toEqual([
			expect.objectContaining({ integrationId: "b", kind: "rate_limited" }),
		]);
	});
});
