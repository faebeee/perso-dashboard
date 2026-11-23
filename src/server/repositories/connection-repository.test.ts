import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createAesGcmCipher } from "../crypto";
import { type AppDatabase, createDatabase } from "../db/client";
import { connections } from "../db/schema";
import {
	type ConnectionRepository,
	createDrizzleConnectionRepository,
} from "./connection-repository";

let db: AppDatabase;
let repo: ConnectionRepository;

beforeEach(() => {
	db = createDatabase(":memory:");
	repo = createDrizzleConnectionRepository(
		db,
		createAesGcmCipher(randomBytes(32).toString("base64")),
	);
});

const tokens = {
	accessToken: "access-1",
	refreshToken: "refresh-1",
	expiresAt: new Date("2026-01-01T00:00:00Z"),
	scopes: ["read"],
};

describe("drizzle connection repository", () => {
	it("saves and reads back a connection with decrypted tokens", async () => {
		await repo.save({
			integrationId: "github",
			tokens,
			accountLabel: "@me",
			meta: { login: "me" },
		});
		await expect(repo.get("github")).resolves.toMatchObject({
			...tokens,
			accountLabel: "@me",
			meta: { login: "me" },
		});
	});

	it("stores tokens encrypted at rest", async () => {
		await repo.save({
			integrationId: "github",
			tokens,
			accountLabel: null,
			meta: {},
		});
		const raw = db.select().from(connections).get();
		expect(raw?.accessToken).not.toContain("access-1");
		expect(raw?.refreshToken).not.toContain("refresh-1");
	});

	it("keeps the old refresh token when the provider doesn't rotate it", async () => {
		await repo.save({
			integrationId: "gmail",
			tokens,
			accountLabel: null,
			meta: {},
		});
		await repo.updateTokens("gmail", {
			...tokens,
			accessToken: "access-2",
			refreshToken: null,
		});
		await expect(repo.get("gmail")).resolves.toMatchObject({
			accessToken: "access-2",
			refreshToken: "refresh-1",
		});
	});

	it("lists summaries without tokens and deletes", async () => {
		await repo.save({
			integrationId: "jira",
			tokens,
			accountLabel: "Acme",
			meta: {},
		});
		const list = await repo.list();
		expect(list).toEqual([
			expect.objectContaining({ integrationId: "jira", accountLabel: "Acme" }),
		]);
		expect(list[0]).not.toHaveProperty("accessToken");

		await repo.delete("jira");
		await expect(repo.get("jira")).resolves.toBeNull();
	});
});
