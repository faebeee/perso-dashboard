import { IntegrationFailure } from "@dashboard/core/result";
import type { WorkItem } from "@dashboard/core/work-item";
import { describe, expect, it } from "vitest";
import { aggregateFeed } from "./aggregate";

const item = (
	id: string,
	updatedAt: string,
	url = `https://x/${id}`,
): WorkItem => ({
	id,
	source: id.split(":")[0] ?? "x",
	kind: "issue",
	title: id,
	url,
	updatedAt,
});

describe("aggregateFeed", () => {
	it("merges sources and sorts newest first", async () => {
		const result = await aggregateFeed([
			{ id: "a", fetch: async () => [item("a:1", "2026-01-01T00:00:00Z")] },
			{
				id: "b",
				fetch: async () => [
					item("b:1", "2026-01-03T00:00:00Z"),
					item("b:2", "2026-01-02T00:00:00Z"),
				],
			},
		]);
		expect(result.items.map((i) => i.id)).toEqual(["b:1", "b:2", "a:1"]);
		expect(result.errors).toEqual([]);
	});

	it("keeps working when one source fails", async () => {
		const result = await aggregateFeed([
			{ id: "ok", fetch: async () => [item("ok:1", "2026-01-01T00:00:00Z")] },
			{
				id: "broken",
				fetch: async () => {
					throw new IntegrationFailure({
						kind: "rate_limited",
						message: "slow down",
					});
				},
			},
		]);
		expect(result.items).toHaveLength(1);
		expect(result.errors).toEqual([
			{ kind: "rate_limited", message: "slow down", integrationId: "broken" },
		]);
	});

	it("dedupes by URL and applies the limit", async () => {
		const result = await aggregateFeed(
			[
				{
					id: "a",
					fetch: async () => [
						item("a:1", "2026-01-03T00:00:00Z", "https://same"),
						item("a:2", "2026-01-02T00:00:00Z", "https://same"),
						item("a:3", "2026-01-01T00:00:00Z"),
					],
				},
			],
			1,
		);
		expect(result.items.map((i) => i.id)).toEqual(["a:1"]);
	});
});
