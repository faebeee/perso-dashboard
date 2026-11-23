import { describe, expect, it } from "vitest";
import { describeSync } from "./sync-status";

const NOW = Date.parse("2026-01-10T12:00:00Z");
const state = (patch: object) => ({
	lastSyncedAt: null,
	pausedUntil: null,
	servingCache: null,
	...patch,
});

describe("describeSync", () => {
	it("reports the last sync", () => {
		expect(describeSync(state({ lastSyncedAt: NOW - 120_000 }), NOW)).toEqual({
			tone: "ok",
			text: "Synced 2 minutes ago",
		});
	});

	it("reports a rate-limit pause, with cached data", () => {
		expect(
			describeSync(
				state({ pausedUntil: NOW + 60_000, servingCache: "rate_limited" }),
				NOW,
			),
		).toMatchObject({
			tone: "paused",
			text: expect.stringMatching(
				/^Paused by rate limit until .+ · showing cached data$/,
			),
		});
	});

	it("ignores a pause that has passed", () => {
		expect(
			describeSync(state({ pausedUntil: NOW - 1, lastSyncedAt: NOW }), NOW)
				?.tone,
		).toBe("ok");
	});

	it("reports being offline", () => {
		expect(describeSync(state({ servingCache: "network" }), NOW)).toEqual({
			tone: "offline",
			text: "Offline · showing cached data",
		});
	});

	it("says nothing before the first request", () => {
		expect(describeSync(undefined, NOW)).toBeNull();
		expect(describeSync(state({}), NOW)).toBeNull();
	});
});
