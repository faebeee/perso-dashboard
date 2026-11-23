import { beforeEach, describe, expect, it } from "vitest";
import { createMemorySqlDriver } from "#/test/memory-sql-driver";
import { createAesGcmCipher } from "../crypto";
import { createDatabase } from "../db/client";
import {
	type ConnectionRepository,
	createDrizzleConnectionRepository,
} from "./connection-repository";
import {
	createDrizzleOAuthClientRepository,
	type OAuthClientRepository,
} from "./oauth-client-repository";

let driver: ReturnType<typeof createMemorySqlDriver>;
let repo: ConnectionRepository;
let clients: OAuthClientRepository;

beforeEach(async () => {
	driver = createMemorySqlDriver();
	const db = await createDatabase(driver);
	const cipher = await createAesGcmCipher(
		crypto.getRandomValues(new Uint8Array(32)),
	);
	repo = createDrizzleConnectionRepository(db, cipher);
	clients = createDrizzleOAuthClientRepository(db, cipher);
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
		const raw = driver.db
			.prepare("SELECT access_token, refresh_token FROM connections")
			.get();
		expect(raw?.access_token).not.toContain("access-1");
		expect(raw?.refresh_token).not.toContain("refresh-1");
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

describe("drizzle oauth client repository", () => {
	it("round-trips credentials, encrypting the secret, and lists ids only", async () => {
		await clients.save("google", {
			clientId: " id-1 ",
			clientSecret: "secret-1",
		});
		await expect(clients.get("google")).resolves.toEqual({
			clientId: "id-1",
			clientSecret: "secret-1",
		});
		await expect(clients.list()).resolves.toEqual([
			{ id: "google", clientId: "id-1" },
		]);
		const raw = driver.db
			.prepare("SELECT client_secret FROM oauth_clients")
			.get();
		expect(raw?.client_secret).not.toContain("secret-1");
	});

	it("returns null for unknown clients and deletes", async () => {
		await expect(clients.get("github")).resolves.toBeNull();
		await clients.save("github", { clientId: "a", clientSecret: "b" });
		await clients.delete("github");
		await expect(clients.get("github")).resolves.toBeNull();
	});
});

describe("migrations", () => {
	it("are idempotent", async () => {
		await expect(createDatabase(driver)).resolves.toBeDefined();
	});
});
