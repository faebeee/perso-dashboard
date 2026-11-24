import type { LlmProviderDefinition } from "@dashboard/core/llm";
import { z } from "zod";
import { llmFailure, readJson, requireKey, send } from "../failures";

const ID = "github-models";
const LABEL = "GitHub Copilot (GitHub Models)";

/** POST /inference/chat/completions (OpenAI-style). */
const completionSchema = z.object({
	choices: z
		.array(z.object({ message: z.object({ content: z.string().nullable() }) }))
		.min(1),
});

/**
 * GitHub's official model API: the models of your Copilot plan, billed
 * against its quota. Needs a token with the "Models: read" permission.
 */
export const githubModelsProvider: LlmProviderDefinition = {
	id: ID,
	label: LABEL,
	description:
		"Models from your GitHub Copilot plan, through GitHub Models. Needs a fine-grained token with Models: read.",
	needsApiKey: true,
	apiKeyHelp: {
		label: "Create a token on github.com",
		url: "https://github.com/settings/personal-access-tokens/new",
	},
	defaultModel: "openai/gpt-4.1",
	async complete({ system, prompt, model, signal }, { apiKey, fetch }) {
		const token = requireKey(ID, LABEL, apiKey);
		const response = await send(ID, "Could not reach models.github.ai.", () =>
			fetch("https://models.github.ai/inference/chat/completions", {
				method: "POST",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
				signal,
				body: JSON.stringify({
					model,
					messages: [
						{ role: "system", content: system },
						{ role: "user", content: prompt },
					],
				}),
			}),
		);
		const parsed = completionSchema.safeParse(
			await readJson(ID, LABEL, response),
		);
		const content = parsed.success
			? parsed.data.choices[0]?.message.content
			: null;
		if (!content) throw llmFailure(ID, "unknown", `${LABEL} sent no answer.`);
		return content.trim();
	},
};
