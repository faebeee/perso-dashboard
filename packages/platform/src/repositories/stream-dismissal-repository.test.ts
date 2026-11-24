import { createMemorySqlDriver } from "@dashboard/platform/testing/memory-sql-driver";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { createDrizzleStreamDismissalRepository } from "./stream-dismissal-repository";

afterEach(() => {
	vi.useRealTimers();
});

describe("stream dismissal repository", () => {
	it("clears, restores and prunes entries", async () => {
		const repo = createDrizzleStreamDismissalRepository(
			await createDatabase(createMemorySqlDriver()),
		);
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T09:00:00Z"));
		await repo.dismiss(["old@1"]);
		vi.setSystemTime(new Date("2026-01-10T09:00:00Z"));
		await repo.dismiss(["a@1", "b@1", "a@1"]);
		await repo.dismiss(["a@1"]); // again: no error
		expect((await repo.list()).sort()).toEqual(["a@1", "b@1", "old@1"]);

		await repo.restore(["b@1"]);
		expect((await repo.list()).sort()).toEqual(["a@1", "old@1"]);

		await repo.prune(new Date("2026-01-05T00:00:00Z"));
		expect(await repo.list()).toEqual(["a@1"]);
	});

	it("handles more entries than one statement takes", async () => {
		const repo = createDrizzleStreamDismissalRepository(
			await createDatabase(createMemorySqlDriver()),
		);
		const ids = Array.from({ length: 450 }, (_, i) => `e${i}@1`);
		await repo.dismiss(ids);
		expect(await repo.list()).toHaveLength(450);
		await repo.restore(ids);
		expect(await repo.list()).toHaveLength(0);
	});
});
