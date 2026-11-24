import { createMemorySqlDriver } from "@dashboard/platform/testing/memory-sql-driver";
import { describe, expect, it } from "vitest";
import { createAesGcmCipher } from "../crypto";
import { createDatabase } from "../db/client";
import { llmCredentials } from "../db/schema";
import { createDrizzleLlmCredentialRepository } from "./llm-credential-repository";

describe("LLM credential repository", () => {
	it("saves keys encrypted, lists, replaces and deletes them", async () => {
		const db = await createDatabase(createMemorySqlDriver());
		const cipher = await createAesGcmCipher(new Uint8Array(32).fill(7));
		const repo = createDrizzleLlmCredentialRepository(db, cipher);

		await repo.save("anthropic", "  sk-ant-secret ");
		expect(await repo.get("anthropic")).toBe("sk-ant-secret");
		expect(await repo.list()).toEqual(["anthropic"]);

		const [row] = await db.select().from(llmCredentials).all();
		expect(row?.apiKey).not.toContain("sk-ant-secret");

		await repo.save("anthropic", "sk-ant-new");
		expect(await repo.get("anthropic")).toBe("sk-ant-new");

		await repo.delete("anthropic");
		expect(await repo.get("anthropic")).toBeNull();
		expect(await repo.list()).toEqual([]);
	});
});
