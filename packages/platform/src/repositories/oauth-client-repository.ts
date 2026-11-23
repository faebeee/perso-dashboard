import type { OAuthClientCredentials } from "@dashboard/core/oauth";
import { eq } from "drizzle-orm";
import type { SecretCipher } from "../crypto";
import type { AppDatabase } from "../db/client";
import { oauthClients } from "../db/schema";

/** Secret-free view of a stored OAuth client, safe to hand to UI code. */
export interface OAuthClientSummary {
	id: string;
	clientId: string;
}

/** The user's own OAuth apps (client id + secret), keyed by OAuthClientRef.id. */
export interface OAuthClientRepository {
	get(id: string): Promise<OAuthClientCredentials | null>;
	list(): Promise<OAuthClientSummary[]>;
	save(id: string, credentials: OAuthClientCredentials): Promise<void>;
	delete(id: string): Promise<void>;
}

export function createDrizzleOAuthClientRepository(
	db: AppDatabase,
	cipher: SecretCipher,
): OAuthClientRepository {
	return {
		async get(id) {
			const row = await db
				.select()
				.from(oauthClients)
				.where(eq(oauthClients.id, id))
				.get();
			if (!row) return null;
			return {
				clientId: row.clientId,
				clientSecret: await cipher.decrypt(row.clientSecret),
			};
		},

		list() {
			return db
				.select({ id: oauthClients.id, clientId: oauthClients.clientId })
				.from(oauthClients)
				.all();
		},

		async save(id, { clientId, clientSecret }) {
			const values = {
				clientId: clientId.trim(),
				clientSecret: await cipher.encrypt(clientSecret.trim()),
				updatedAt: new Date(),
			};
			await db
				.insert(oauthClients)
				.values({ id, ...values })
				.onConflictDoUpdate({ target: oauthClients.id, set: values })
				.run();
		},

		async delete(id) {
			await db.delete(oauthClients).where(eq(oauthClients.id, id)).run();
		},
	};
}
