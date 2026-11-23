import { beforeEach, describe, expect, it } from "vitest";
import { createMemorySqlDriver } from "#/test/memory-sql-driver";
import { type AppDatabase, createDatabase } from "../db/client";
import { createDrizzleDismissalRepository } from "./dismissal-repository";
import { createDrizzleTodayRepository } from "./today-repository";

let db: AppDatabase;
beforeEach(async () => {
	db = await createDatabase(createMemorySqlDriver());
});

const NOW = new Date(2026, 0, 7, 10, 0);

describe("dismissal repository", () => {
	it("saves, lists, replaces and deletes", async () => {
		const repo = createDrizzleDismissalRepository(db);
		await repo.save({
			itemId: "a",
			mode: "done",
			until: null,
			fingerprint: "f1",
		});
		await repo.save({
			itemId: "a",
			mode: "done",
			until: null,
			fingerprint: "f2",
		});
		expect(await repo.list(NOW)).toEqual([
			{ itemId: "a", mode: "done", until: null, fingerprint: "f2" },
		]);
		await repo.delete("a");
		expect(await repo.list(NOW)).toEqual([]);
	});

	it("drops expired snoozes and keeps running ones", async () => {
		const repo = createDrizzleDismissalRepository(db);
		const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
		await repo.save({
			itemId: "old",
			mode: "snoozed",
			until: at(-1),
			fingerprint: "",
		});
		await repo.save({
			itemId: "new",
			mode: "snoozed",
			until: at(60),
			fingerprint: "",
		});
		expect((await repo.list(NOW)).map((d) => d.itemId)).toEqual(["new"]);
	});
});

describe("today repository", () => {
	const startOfToday = new Date(2026, 0, 7);
	const ref = {
		source: "jira",
		itemKind: "issue",
		itemId: "jira:1",
		url: "https://x/browse/WEB-1",
		detailRef: "WEB-1",
	};

	it("adds notes and pinned items, and pinning twice keeps one entry", async () => {
		const repo = createDrizzleTodayRepository(db);
		await repo.add({ kind: "note", title: "  Write release notes " });
		const first = await repo.add({ kind: "item", title: "Fix checkout", ref });
		await repo.setDone(first.id, true);
		const again = await repo.add({ kind: "item", title: "Fix checkout", ref });

		expect(again.id).toBe(first.id);
		const items = await repo.list(startOfToday);
		expect(
			items.map((i) => [i.kind, i.title, i.done, i.ref?.detailRef]),
		).toEqual([
			["note", "Write release notes", false, undefined],
			["item", "Fix checkout", false, "WEB-1"],
		]);
	});

	it("shows open items and today's finished ones, hides older finished ones", async () => {
		const repo = createDrizzleTodayRepository(db);
		const done = await repo.add({ kind: "note", title: "done today" });
		await repo.setDone(done.id, true);
		await repo.add({ kind: "note", title: "still open" });

		expect((await repo.list(startOfToday)).map((i) => i.title)).toEqual([
			"done today",
			"still open",
		]);
		const tomorrow = new Date(Date.now() + 24 * 60 * 60_000);
		expect((await repo.list(tomorrow)).map((i) => i.title)).toEqual([
			"still open",
		]);
	});
});
