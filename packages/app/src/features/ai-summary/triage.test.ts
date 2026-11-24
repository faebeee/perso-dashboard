import { createAesGcmCipher } from "@dashboard/platform/crypto";
import { createDatabase } from "@dashboard/platform/db/client";
import { preferences } from "@dashboard/platform/preferences";
import { createDrizzleAiSummaryRepository } from "@dashboard/platform/repositories/ai-summary-repository";
import { createMemorySqlDriver } from "@dashboard/platform/testing/memory-sql-driver";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { completeJson, jsonSchemaOf, parseJsonLoosely } from "./fetchers";
import { loadTriage, runTriage, type TriageItem } from "./triage";

const hostFetch = vi.fn();
vi.mock("@dashboard/platform/host", () => ({
	getHost: () => ({ fetch: hostFetch }),
}));

let services: Record<string, unknown>;
vi.mock("@dashboard/platform/services", () => ({
	getServices: async () => services,
}));

/** An Ollama answer whose content is `content`. */
const answer = (content: unknown) =>
	new Response(
		JSON.stringify({
			message: {
				content:
					typeof content === "string" ? content : JSON.stringify(content),
			},
		}),
		{ headers: { "content-type": "application/json" } },
	);

/** The item ids the last request asked about. */
const sentIds = (call: number) => {
	const init = hostFetch.mock.calls[call]?.[1] as RequestInit;
	const prompt = JSON.parse(String(init.body)).messages[1].content as string;
	return prompt
		.split("\n")
		.slice(1)
		.map((line) => JSON.parse(line).id);
};

const item = (id: string, version = "1"): TriageItem => ({
	id,
	source: "gmail",
	kind: "email",
	title: `Mail ${id}`,
	from: "Ada",
	version,
});

const triaged = (ids: string[]) => ({
	items: ids.map((id) => ({
		id,
		gist: `About ${id}`,
		action: "reply",
		reason: "asks a question",
	})),
});

beforeEach(async () => {
	const db = await createDatabase(createMemorySqlDriver());
	const cipher = await createAesGcmCipher(new Uint8Array(32).fill(2));
	services = { aiSummaries: createDrizzleAiSummaryRepository(db, cipher) };
	hostFetch.mockReset();
	preferences.set("llm", { provider: "ollama-local", models: {} });
});

describe("triage", () => {
	it("sends only new or changed items and reuses stored results", async () => {
		hostFetch.mockImplementationOnce(async () => answer(triaged(["a", "b"])));
		expect(await runTriage([item("a"), item("b")])).toBe(2);
		expect((await loadTriage([item("a"), item("b")])).get("a")?.gist).toBe(
			"About a",
		);

		// "b" changed, "c" is new, "a" is unchanged.
		hostFetch.mockImplementationOnce(async () => answer(triaged(["b", "c"])));
		expect(await runTriage([item("a"), item("b", "2"), item("c")])).toBe(2);
		expect(sentIds(1)).toEqual(["b", "c"]);

		// Nothing changed: no request at all.
		expect(await runTriage([item("a"), item("b", "2"), item("c")])).toBe(0);
		expect(hostFetch).toHaveBeenCalledTimes(2);
	});

	it("ignores ids the model made up and leaves missing ones open", async () => {
		hostFetch.mockImplementationOnce(async () => answer(triaged(["a", "zzz"])));
		await runTriage([item("a"), item("b")]);
		const results = await loadTriage([item("a"), item("b")]);
		expect([...results.keys()]).toEqual(["a"]);
	});
});

describe("completeJson", () => {
	const schema = jsonSchemaOf("x", z.object({}));

	it("builds a provider-ready JSON Schema", () => {
		expect(schema.schema).not.toHaveProperty("$schema");
		expect(schema.schema.type).toBe("object");
	});

	it("retries once on invalid JSON, then fails clearly", async () => {
		hostFetch
			.mockImplementationOnce(async () => answer("not json"))
			.mockImplementationOnce(async () => answer({ ok: true }));
		expect(
			await completeJson(
				{ system: "s", prompt: "p" },
				"x",
				z.object({ ok: z.boolean() }),
			),
		).toEqual({ ok: true });

		hostFetch.mockImplementation(async () => answer("still not json"));
		await expect(
			completeJson(
				{ system: "s", prompt: "p" },
				"x",
				z.object({ ok: z.boolean() }),
			),
		).rejects.toThrow(/expected format/);
	});

	it("reads JSON wrapped in a code fence or prose", () => {
		expect(parseJsonLoosely('```json\n{"a":1}\n```')).toEqual({ a: 1 });
		expect(parseJsonLoosely('Here you go: {"a":2} done')).toEqual({ a: 2 });
		expect(parseJsonLoosely("nothing")).toBeUndefined();
	});
});
