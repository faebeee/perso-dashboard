import { describe, expect, it } from "vitest";
import { waitedFor } from "./waiting";

describe("waitedFor", () => {
	const now = new Date("2026-01-10T12:00:00Z");
	it.each([
		["2026-01-10T11:30:00Z", "under an hour"],
		["2026-01-10T11:00:00Z", "1 hour"],
		["2026-01-09T00:00:00Z", "36 hours"],
		["2026-01-07T12:00:00Z", "3 days"],
	])("%s → %s", (since, expected) => {
		expect(waitedFor(since, now)).toBe(expected);
	});
});
