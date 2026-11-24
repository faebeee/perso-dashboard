import { IntegrationFailure } from "@dashboard/core/result";
import { describe, expect, it, vi } from "vitest";
import { anthropicProvider } from "./providers/anthropic";
import { githubModelsProvider } from "./providers/github-models";
import { ollamaCloudProvider, ollamaLocalProvider } from "./providers/ollama";
import { llmProviders } from "./registry";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

/** A fetch that records requests and answers with `respond`. */
function stubFetch(respond: () => Response | Promise<Response>) {
	const calls: {
		url: string;
		init: RequestInit;
		body: Record<string, unknown>;
	}[] = [];
	const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = input instanceof Request ? input : undefined;
		const body = init?.body ?? (request ? await request.text() : undefined);
		calls.push({
			url: request ? request.url : String(input),
			init: init ?? {},
			body: typeof body === "string" ? JSON.parse(body) : {},
		});
		return respond();
	}) as unknown as typeof globalThis.fetch;
	return { fetch, calls };
}

const request = { system: "sys", prompt: "log", model: "m1" };

const failureOf = async (promise: Promise<unknown>) => {
	try {
		await promise;
	} catch (cause) {
		expect(cause).toBeInstanceOf(IntegrationFailure);
		return (cause as IntegrationFailure).error;
	}
	throw new Error("expected a failure");
};

describe("registry", () => {
	it("has unique ids and a default model for every provider", () => {
		const ids = llmProviders.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of llmProviders) expect(p.defaultModel).not.toBe("");
	});
});

describe("Ollama", () => {
	it("calls the local chat API without a key", async () => {
		const { fetch, calls } = stubFetch(() =>
			json({ message: { role: "assistant", content: " Summary \n" } }),
		);
		expect(await ollamaLocalProvider.complete(request, { fetch })).toBe(
			"Summary",
		);
		expect(calls[0]?.url).toBe("http://127.0.0.1:11434/api/chat");
		expect(calls[0]?.body).toEqual({
			model: "m1",
			stream: false,
			messages: [
				{ role: "system", content: "sys" },
				{ role: "user", content: "log" },
			],
		});
		expect(new Headers(calls[0]?.init.headers).has("Authorization")).toBe(
			false,
		);
	});

	it("explains when the local server isn't running", async () => {
		const fetch = vi.fn(async () => {
			throw new TypeError("connection refused");
		}) as unknown as typeof globalThis.fetch;
		const error = await failureOf(
			ollamaLocalProvider.complete(request, { fetch }),
		);
		expect(error.kind).toBe("network");
		expect(error.message).toMatch(/ollama serve/);
	});

	it("sends the key to Ollama Cloud and needs one", async () => {
		const { fetch, calls } = stubFetch(() =>
			json({ message: { content: "ok" } }),
		);
		await ollamaCloudProvider.complete(request, { fetch, apiKey: "k" });
		expect(calls[0]?.url).toBe("https://ollama.com/api/chat");
		expect(new Headers(calls[0]?.init.headers).get("Authorization")).toBe(
			"Bearer k",
		);
		expect(
			(await failureOf(ollamaCloudProvider.complete(request, { fetch }))).kind,
		).toBe("not_configured");
	});

	it("maps a rejected key and an unknown model", async () => {
		const unauthorized = stubFetch(() => json({ error: "unauthorized" }, 401));
		expect(
			(
				await failureOf(
					ollamaCloudProvider.complete(request, {
						fetch: unauthorized.fetch,
						apiKey: "bad",
					}),
				)
			).kind,
		).toBe("unauthorized");
		const missing = stubFetch(() =>
			json({ error: "model 'm1' not found" }, 404),
		);
		const error = await failureOf(
			ollamaLocalProvider.complete(request, { fetch: missing.fetch }),
		);
		expect(error.message).toMatch(/model 'm1' not found/);
	});
});

describe("GitHub Models", () => {
	it("calls the inference API with the token", async () => {
		const { fetch, calls } = stubFetch(() =>
			json({ choices: [{ message: { content: "Done things" } }] }),
		);
		expect(
			await githubModelsProvider.complete(request, { fetch, apiKey: "ghp" }),
		).toBe("Done things");
		expect(calls[0]?.url).toBe(
			"https://models.github.ai/inference/chat/completions",
		);
		expect(new Headers(calls[0]?.init.headers).get("Authorization")).toBe(
			"Bearer ghp",
		);
		expect(calls[0]?.body.model).toBe("m1");
	});

	it("reports rate limits", async () => {
		const { fetch } = stubFetch(() => json({ message: "slow down" }, 429));
		expect(
			(
				await failureOf(
					githubModelsProvider.complete(request, { fetch, apiKey: "ghp" }),
				)
			).kind,
		).toBe("rate_limited");
	});
});

describe("Claude", () => {
	const message = (overrides: Record<string, unknown> = {}) => ({
		id: "msg_1",
		type: "message",
		role: "assistant",
		model: "m1",
		content: [{ type: "text", text: "Summary" }],
		stop_reason: "end_turn",
		stop_details: null,
		usage: { input_tokens: 1, output_tokens: 1 },
		...overrides,
	});

	it("sends system, prompt, low effort and fallbacks", async () => {
		const { fetch, calls } = stubFetch(() => json(message()));
		expect(
			await anthropicProvider.complete(request, { fetch, apiKey: "sk" }),
		).toBe("Summary");
		expect(calls[0]?.url).toContain("https://api.anthropic.com/v1/messages");
		expect(calls[0]?.body).toMatchObject({
			model: "m1",
			system: "sys",
			messages: [{ role: "user", content: "log" }],
			output_config: { effort: "low" },
			fallbacks: "default",
		});
	});

	it("treats a refusal as a failure", async () => {
		const { fetch } = stubFetch(() =>
			json(message({ stop_reason: "refusal", content: [] })),
		);
		expect(
			(
				await failureOf(
					anthropicProvider.complete(request, { fetch, apiKey: "sk" }),
				)
			).message,
		).toMatch(/declined/);
	});

	it("maps a rejected key", async () => {
		const { fetch } = stubFetch(() =>
			json(
				{
					type: "error",
					error: { type: "authentication_error", message: "invalid x-api-key" },
				},
				401,
			),
		);
		expect(
			(
				await failureOf(
					anthropicProvider.complete(request, { fetch, apiKey: "sk" }),
				)
			).kind,
		).toBe("unauthorized");
	});
});
