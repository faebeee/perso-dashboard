import { describe, expect, it } from "vitest";
import { dayLabel } from "./stream-list";

describe("dayLabel", () => {
	const now = new Date(2026, 10, 24, 9, 0).getTime();
	it("names today and yesterday, dates the rest", () => {
		expect(dayLabel(new Date(2026, 10, 24, 0, 5).getTime(), now)).toBe("Today");
		expect(dayLabel(new Date(2026, 10, 23, 23, 59).getTime(), now)).toBe(
			"Yesterday",
		);
		expect(dayLabel(new Date(2026, 10, 22, 12).getTime(), now)).not.toMatch(
			/Today|Yesterday/,
		);
	});
});
