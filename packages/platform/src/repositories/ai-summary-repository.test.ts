import { createMemorySqlDriver } from "@dashboard/platform/testing/memory-sql-driver";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAesGcmCipher } from "../crypto";
import { createDatabase } from "../db/client";
import { aiSummaries } from "../db/schema";
import { createDrizzleAiSummaryRepository } from "./ai-summary-repository";

afterEach(() => {
	vi.useRealTimers();
});

describe("AI summary repository", () => {
	it("stores encrypted, finds by key and the newest per scope, prunes", async () => {
		const db = await createDatabase(createMemorySqlDriver());
		const cipher = await createAesGcmCipher(new Uint8Array(32).fill(3));
		const repo = createDrizzleAiSummaryRepository(db, cipher);
		const summary = (key: string, scope: string, text: string) => ({
			key,
			scope,
			text,
			providerId: "anthropic",
			model: "m",
		});

		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-10T09:00:00Z"));
		await repo.save(summary("k1", "s", "Old work"));
		vi.setSystemTime(new Date("2026-01-14T09:00:00Z"));
		await repo.save(summary("k2", "s", "New work"));
		await repo.save(summary("k3", "other", "Other"));

		expect((await repo.get("k1"))?.text).toBe("Old work");
		expect(await repo.get("missing")).toBeNull();
		expect((await repo.latest("s"))?.key).toBe("k2");

		const rows = await db.select().from(aiSummaries).all();
		expect(rows.some((r) => r.text.includes("work"))).toBe(false);

		await repo.prune(new Date("2026-01-12T00:00:00Z"));
		expect(await repo.get("k1")).toBeNull();
		expect((await repo.get("k2"))?.text).toBe("New work");
	});
});
