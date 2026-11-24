import { createAesGcmCipher } from "@dashboard/platform/crypto";
import { createDatabase } from "@dashboard/platform/db/client";
import { preferences } from "@dashboard/platform/preferences";
import { createDrizzleAiSummaryRepository } from "@dashboard/platform/repositories/ai-summary-repository";
import { createMemorySqlDriver } from "@dashboard/platform/testing/memory-sql-driver";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSummary, summarize, summaryKey } from "./fetchers";

const hostFetch = vi.fn();
vi.mock("@dashboard/platform/host", () => ({
	getHost: () => ({ fetch: hostFetch }),
}));

let services: Record<string, unknown>;
vi.mock("@dashboard/platform/services", () => ({
	getServices: async () => services,
}));

const answer = (text: string) =>
	new Response(JSON.stringify({ message: { content: text } }), {
		headers: { "content-type": "application/json" },
	});

beforeEach(async () => {
	const db = await createDatabase(createMemorySqlDriver());
	const cipher = await createAesGcmCipher(new Uint8Array(32).fill(1));
	services = { aiSummaries: createDrizzleAiSummaryRepository(db, cipher) };
	hostFetch.mockReset();
	preferences.set("llm", { provider: "ollama-local", models: {} });
});

const review = { scope: "since_last_workday|all", system: "sys", prompt: "A" };

describe("summarize", () => {
	it("asks the model once per content and reuses the stored summary", async () => {
		hostFetch.mockImplementation(async () => answer("First"));
		expect((await summarize(review)).text).toBe("First");
		expect((await summarize(review)).text).toBe("First");
		expect(hostFetch).toHaveBeenCalledTimes(1);

		const lookup = await loadSummary(review);
		expect(lookup.current?.text).toBe("First");
		expect(hostFetch).toHaveBeenCalledTimes(1);
	});

	it("shows the last summary as outdated when the review changed", async () => {
		hostFetch.mockImplementation(async () => answer("First"));
		await summarize(review);

		const changed = { ...review, prompt: "A + a new commit" };
		const lookup = await loadSummary(changed);
		expect(lookup.current).toBeNull();
		expect(lookup.latest?.text).toBe("First");

		hostFetch.mockImplementation(async () => answer("Second"));
		expect((await summarize(changed)).text).toBe("Second");
		expect(hostFetch).toHaveBeenCalledTimes(2);
	});

	it("needs a new summary for another model", async () => {
		hostFetch.mockImplementation(async () => answer("First"));
		await summarize(review);
		preferences.set("llm", {
			provider: "ollama-local",
			models: { "ollama-local": "gemma4:12b" },
		});
		expect((await loadSummary(review)).current).toBeNull();
	});
});

describe("summaryKey", () => {
	it("is stable and changes with any input", async () => {
		const base = { providerId: "p", model: "m", system: "s", prompt: "x" };
		const key = await summaryKey(base);
		expect(await summaryKey({ ...base })).toBe(key);
		for (const change of [
			{ providerId: "q" },
			{ model: "n" },
			{ system: "t" },
			{ prompt: "y" },
		])
			expect(await summaryKey({ ...base, ...change })).not.toBe(key);
	});
});
