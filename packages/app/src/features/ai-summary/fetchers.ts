import type { LlmRequest } from "@dashboard/core/llm";
import { IntegrationFailure } from "@dashboard/core/result";
import { getHost } from "@dashboard/platform/host";
import { preferences } from "@dashboard/platform/preferences";
import type { StoredAiSummary } from "@dashboard/platform/repositories/ai-summary-repository";
import { getServices } from "@dashboard/platform/services";
import { z } from "zod";
import { getLlmProvider } from "#/llm/registry";

/** The provider and model chosen in Preferences, or null when the AI summary is off. */
export function chosenLlm() {
	const { provider, models } = preferences.get().llm;
	const definition = getLlmProvider(provider);
	if (!definition) return null;
	return {
		provider: definition,
		model: models[definition.id]?.trim() || definition.defaultModel,
	};
}

/** One completion from the chosen provider (or `providerId`, for "Test"). */
export async function complete(input: {
	system: string;
	prompt: string;
	providerId?: string;
	signal?: AbortSignal;
	schema?: LlmRequest["schema"];
}): Promise<string> {
	const chosen = input.providerId
		? (() => {
				const provider = getLlmProvider(input.providerId);
				if (!provider) return null;
				const model = preferences.get().llm.models[provider.id]?.trim();
				return { provider, model: model || provider.defaultModel };
			})()
		: chosenLlm();
	if (!chosen)
		throw new IntegrationFailure({
			kind: "not_configured",
			message: "Choose an AI provider in Preferences first.",
		});
	const { provider, model } = chosen;
	const apiKey = provider.needsApiKey
		? ((await (await getServices()).llmCredentials.get(provider.id)) ??
			undefined)
		: undefined;
	return provider.complete(
		{
			system: input.system,
			prompt: input.prompt,
			model,
			signal: input.signal,
			schema: input.schema,
		},
		{ apiKey, fetch: getHost().fetch },
	);
}

/** Pure: a zod schema → the JSON Schema providers understand (no `$schema`). */
export function jsonSchemaOf(
	name: string,
	schema: z.ZodType,
): NonNullable<LlmRequest["schema"]> {
	const { $schema: _, ...json } = z.toJSONSchema(schema) as Record<
		string,
		unknown
	>;
	return { name, schema: json };
}

/**
 * A completion as validated JSON. Asks for structured output; a provider
 * or model that still answers with invalid JSON gets one more try.
 */
export async function completeJson<T>(
	input: { system: string; prompt: string; signal?: AbortSignal },
	name: string,
	schema: z.ZodType<T>,
): Promise<T> {
	const request = { ...input, schema: jsonSchemaOf(name, schema) };
	let lastError = "";
	for (let attempt = 0; attempt < 2; attempt++) {
		const text = await complete(request);
		const parsed = schema.safeParse(parseJsonLoosely(text));
		if (parsed.success) return parsed.data;
		lastError = parsed.error.issues[0]?.message ?? "invalid JSON";
	}
	throw new IntegrationFailure({
		kind: "unknown",
		message: `The model's answer didn't have the expected format (${lastError}). Try again or another model.`,
	});
}

/** Pure: JSON from a model answer, also when wrapped in a ``` fence or prose. */
export function parseJsonLoosely(text: string): unknown {
	const trimmed = text.trim();
	const candidates = [
		trimmed,
		trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1],
		trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1),
	];
	for (const candidate of candidates) {
		if (!candidate) continue;
		try {
			return JSON.parse(candidate);
		} catch {
			// try the next shape
		}
	}
	return undefined;
}

export async function listSavedLlmKeys(): Promise<string[]> {
	return (await getServices()).llmCredentials.list();
}

export async function saveLlmKey(providerId: string, apiKey: string) {
	await (await getServices()).llmCredentials.save(providerId, apiKey);
}

export async function deleteLlmKey(providerId: string) {
	await (await getServices()).llmCredentials.delete(providerId);
}

/** What a summary is made from. `scope` groups versions of one review. */
export interface SummaryInput {
	scope: string;
	system: string;
	prompt: string;
}

/** The stored summary of exactly this content, and the newest one of its scope. */
export interface SummaryLookup {
	current: StoredAiSummary | null;
	/** Equals `current` when that exists; otherwise an outdated summary, if any. */
	latest: StoredAiSummary | null;
}

/**
 * Pure (async only for the digest): the cache key. Any change to what the
 * model would see, or to the provider or model, gives a new key.
 */
export async function summaryKey(input: {
	providerId: string;
	model: string;
	system: string;
	prompt: string;
}): Promise<string> {
	const data = new TextEncoder().encode(
		JSON.stringify([input.providerId, input.model, input.system, input.prompt]),
	);
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
	return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

const keyFor = async (input: SummaryInput) => {
	const chosen = chosenLlm();
	if (!chosen) return null;
	return {
		chosen,
		key: await summaryKey({
			providerId: chosen.provider.id,
			model: chosen.model,
			system: input.system,
			prompt: input.prompt,
		}),
	};
};

/** Stored summaries for this review: no model call. */
export async function loadSummary(input: SummaryInput): Promise<SummaryLookup> {
	const resolved = await keyFor(input);
	if (!resolved) return { current: null, latest: null };
	const { aiSummaries } = await getServices();
	const current = await aiSummaries.get(resolved.key);
	return {
		current,
		latest: current ?? (await aiSummaries.latest(input.scope)),
	};
}

/**
 * The summary of this review: the stored one when the content is unchanged,
 * otherwise a new one from the model, which is then stored.
 */
export async function summarize(
	input: SummaryInput & { signal?: AbortSignal },
): Promise<StoredAiSummary> {
	const resolved = await keyFor(input);
	if (!resolved)
		throw new IntegrationFailure({
			kind: "not_configured",
			message: "Choose an AI provider in Preferences first.",
		});
	const { aiSummaries } = await getServices();
	const stored = await aiSummaries.get(resolved.key);
	if (stored) return stored;
	const text = await complete({
		system: input.system,
		prompt: input.prompt,
		providerId: resolved.chosen.provider.id,
		signal: input.signal,
	});
	return aiSummaries.save({
		key: resolved.key,
		scope: input.scope,
		text,
		providerId: resolved.chosen.provider.id,
		model: resolved.chosen.model,
	});
}
