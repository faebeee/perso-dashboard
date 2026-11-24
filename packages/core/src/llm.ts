/**
 * The LLM port: one adapter per provider (Ollama, Claude, GitHub Models…).
 * Features ask for a completion; they never know which provider answers.
 *
 * Adapters throw `IntegrationFailure` (see result.ts) with kind
 * `unauthorized`, `rate_limited`, `network` or `unknown`, so the UI can
 * explain what went wrong the same way it does for integrations.
 */

export interface LlmRequest {
	/** Instructions: role, format, rules. */
	system: string;
	/** The material to work on. */
	prompt: string;
	model: string;
	signal?: AbortSignal;
}

export interface LlmContext {
	/** Absent for providers that need none (a local Ollama). */
	apiKey?: string;
	/** CORS-free fetch from the host. */
	fetch: typeof fetch;
}

export interface LlmProviderDefinition {
	/** Stable id, used for stored keys and preferences ("anthropic"). */
	id: string;
	label: string;
	/** One line for the settings page. */
	description: string;
	needsApiKey: boolean;
	/** Where to create a key, shown next to the key field. */
	apiKeyHelp?: { label: string; url: string };
	/** Used when the user hasn't entered a model. */
	defaultModel: string;
	/** The answer as plain text. */
	complete(request: LlmRequest, context: LlmContext): Promise<string>;
}

/** Integration id used in errors from an LLM provider ("llm:anthropic"). */
export const llmErrorSource = (providerId: string) => `llm:${providerId}`;
