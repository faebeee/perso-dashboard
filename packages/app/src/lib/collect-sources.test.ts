import { describe, expect, it } from "vitest";
import { settleLeniently } from "./collect-sources";

describe("settleLeniently", () => {
	it("skips individual failures", async () => {
		await expect(
			settleLeniently([Promise.resolve(1), Promise.reject(new Error("x"))]),
		).resolves.toEqual([1]);
	});

	it("throws when every call failed", async () => {
		await expect(
			settleLeniently([Promise.reject(new Error("auth"))]),
		).rejects.toThrow("auth");
	});

	it("returns an empty list for no calls", async () => {
		await expect(settleLeniently([])).resolves.toEqual([]);
	});
});
