import type { LlmProviderDefinition } from "@dashboard/core/llm";
import { anthropicProvider } from "./providers/anthropic";
import { githubModelsProvider } from "./providers/github-models";
import { ollamaCloudProvider, ollamaLocalProvider } from "./providers/ollama";

/**
 * LLM providers the user can choose from. Adding one means writing its
 * adapter in `providers/` and listing it here (plus its host in
 * `platform/http-allowlist.ts` and the Tauri capability).
 */
export const llmProviders: readonly LlmProviderDefinition[] = [
	ollamaLocalProvider,
	ollamaCloudProvider,
	anthropicProvider,
	githubModelsProvider,
];

export function getLlmProvider(
	id: string | null | undefined,
): LlmProviderDefinition | undefined {
	return llmProviders.find((p) => p.id === id);
}
