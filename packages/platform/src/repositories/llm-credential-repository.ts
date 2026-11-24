import { eq } from "drizzle-orm";
import type { SecretCipher } from "../crypto";
import type { AppDatabase } from "../db/client";
import { llmCredentials } from "../db/schema";

/** API keys of LLM providers, encrypted at rest. */
export interface LlmCredentialRepository {
	get(providerId: string): Promise<string | null>;
	/** Providers with a saved key (no secrets: safe to hand to UI code). */
	list(): Promise<string[]>;
	save(providerId: string, apiKey: string): Promise<void>;
	delete(providerId: string): Promise<void>;
}

export function createDrizzleLlmCredentialRepository(
	db: AppDatabase,
	cipher: SecretCipher,
): LlmCredentialRepository {
	return {
		async get(providerId) {
			const row = await db
				.select()
				.from(llmCredentials)
				.where(eq(llmCredentials.providerId, providerId))
				.get();
			return row ? cipher.decrypt(row.apiKey) : null;
		},

		async list() {
			const rows = await db
				.select({ providerId: llmCredentials.providerId })
				.from(llmCredentials)
				.all();
			return rows.map((r) => r.providerId);
		},

		async save(providerId, apiKey) {
			const values = {
				apiKey: await cipher.encrypt(apiKey.trim()),
				updatedAt: new Date(),
			};
			await db
				.insert(llmCredentials)
				.values({ providerId, ...values })
				.onConflictDoUpdate({ target: llmCredentials.providerId, set: values })
				.run();
		},

		async delete(providerId) {
			await db
				.delete(llmCredentials)
				.where(eq(llmCredentials.providerId, providerId))
				.run();
		},
	};
}
