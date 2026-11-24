import Anthropic from "@anthropic-ai/sdk";
import type { LlmProviderDefinition } from "@dashboard/core/llm";
import { failureForStatus, llmFailure, requireKey } from "../failures";

const ID = "anthropic";
const LABEL = "Claude";

/** Claude through the official SDK, with the host's CORS-free fetch. */
export const anthropicProvider: LlmProviderDefinition = {
	id: ID,
	label: LABEL,
	description:
		"Anthropic's Claude models, with an API key from the Claude Console.",
	needsApiKey: true,
	apiKeyHelp: {
		label: "Create a key in the Claude Console",
		url: "https://platform.claude.com/settings/keys",
	},
	defaultModel: "claude-opus-5-5",
	async complete({ system, prompt, model, signal, schema }, { apiKey, fetch }) {
		const client = new Anthropic({
			apiKey: requireKey(ID, LABEL, apiKey),
			fetch,
			// The webview is this app's own UI, not a website: the key never
			// reaches a third party, and requests go through the Tauri HTTP plugin.
			dangerouslyAllowBrowser: true,
			timeout: 120_000,
		});
		let response: Anthropic.Beta.BetaMessage;
		try {
			response = await client.beta.messages.create(
				{
					model,
					max_tokens: 16000,
					system,
					messages: [{ role: "user", content: prompt }],
					// A short summary needs little reasoning.
					output_config: {
						effort: "low",
						...(schema
							? { format: { type: "json_schema", schema: schema.schema } }
							: {}),
					},
					// If the model declines, the API retries on a suitable fallback.
					betas: ["server-side-fallback-2026-07-01"],
					fallbacks: "default",
				},
				{ signal },
			);
		} catch (cause) {
			if (cause instanceof Anthropic.APIUserAbortError) throw cause;
			if (cause instanceof Anthropic.APIConnectionError)
				throw llmFailure(ID, "network", "Could not reach api.anthropic.com.");
			if (cause instanceof Anthropic.APIError && cause.status)
				throw failureForStatus(ID, LABEL, cause.status, cause.message);
			throw cause;
		}
		if (response.stop_reason === "refusal")
			throw llmFailure(
				ID,
				"unknown",
				"Claude declined to summarize this. Try another model or provider.",
			);
		const text = response.content
			.flatMap((block) => (block.type === "text" ? [block.text] : []))
			.join("")
			.trim();
		if (!text) throw llmFailure(ID, "unknown", "Claude sent no answer.");
		return text;
	},
};
