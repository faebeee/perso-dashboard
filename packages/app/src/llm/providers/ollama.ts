import type { LlmProviderDefinition } from "@dashboard/core/llm";
import { IntegrationFailure } from "@dashboard/core/result";
import { z } from "zod";
import { llmFailure, readJson, requireKey, send } from "../failures";

/** POST /api/chat, non-streaming. */
const chatResponseSchema = z.object({
	message: z.object({ content: z.string() }),
});

function createOllamaProvider(options: {
	id: string;
	label: string;
	description: string;
	baseUrl: string;
	needsApiKey: boolean;
	defaultModel: string;
	unreachable: string;
	apiKeyHelp?: LlmProviderDefinition["apiKeyHelp"];
}): LlmProviderDefinition {
	const { id, label, baseUrl, unreachable } = options;
	return {
		id,
		label,
		description: options.description,
		needsApiKey: options.needsApiKey,
		apiKeyHelp: options.apiKeyHelp,
		defaultModel: options.defaultModel,
		async complete(
			{ system, prompt, model, signal, schema },
			{ apiKey, fetch },
		) {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (options.needsApiKey)
				headers.Authorization = `Bearer ${requireKey(id, label, apiKey)}`;
			const response = await send(id, unreachable, () =>
				fetch(`${baseUrl}/api/chat`, {
					method: "POST",
					headers,
					signal,
					body: JSON.stringify({
						model,
						stream: false,
						// Ollama constrains the output to a JSON Schema via `format`.
						...(schema ? { format: schema.schema } : {}),
						messages: [
							{ role: "system", content: system },
							{ role: "user", content: prompt },
						],
					}),
				}),
			);
			const body = await readJson(id, label, response).catch((cause) => {
				// A local model has to be pulled first: say how.
				if (
					!options.needsApiKey &&
					cause instanceof IntegrationFailure &&
					response.status === 404
				)
					throw llmFailure(
						id,
						"unknown",
						`${cause.message}. Pull it with "ollama pull ${model}" or enter an installed model in Preferences.`,
					);
				throw cause;
			});
			const parsed = chatResponseSchema.safeParse(body);
			if (!parsed.success)
				throw llmFailure(id, "unknown", `${label} sent no answer.`);
			return parsed.data.message.content.trim();
		},
	};
}

export const ollamaLocalProvider = createOllamaProvider({
	id: "ollama-local",
	label: "Ollama (local)",
	description:
		"Runs on this computer: nothing leaves it. Needs Ollama running (ollama serve) and the model pulled.",
	baseUrl: "http://127.0.0.1:11434",
	needsApiKey: false,
	defaultModel: "llama3.2",
	unreachable:
		"Could not reach Ollama on 127.0.0.1:11434. Is it running (ollama serve)?",
});

export const ollamaCloudProvider = createOllamaProvider({
	id: "ollama-cloud",
	label: "Ollama Cloud",
	description: "Ollama's hosted models, with an API key from ollama.com.",
	baseUrl: "https://ollama.com",
	needsApiKey: true,
	apiKeyHelp: {
		label: "Create a key on ollama.com",
		url: "https://ollama.com/settings/keys",
	},
	defaultModel: "gpt-oss:120b",
	unreachable: "Could not reach ollama.com.",
});
