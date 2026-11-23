import { describe, expect, it } from "vitest";
import { type Release, sortReleases } from "./release";

const r = (id: string, state: Release["state"], date?: string): Release => ({
	id,
	source: "x",
	name: id,
	url: "#",
	project: "p",
	state,
	date,
	tags: [],
});

describe("sortReleases", () => {
	it("puts upcoming first (soonest, undated last), then released newest first", () => {
		const sorted = sortReleases([
			r("old", "released", "2026-01-01"),
			r("later", "upcoming", "2026-02-01"),
			r("undated", "upcoming"),
			r("new", "released", "2026-01-10T12:00:00Z"),
			r("soon", "upcoming", "2026-01-15"),
		]);
		expect(sorted.map((x) => x.id)).toEqual([
			"soon",
			"later",
			"undated",
			"new",
			"old",
		]);
	});
});
