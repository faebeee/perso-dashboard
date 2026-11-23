import "@tanstack/react-start/server-only";
import { eq } from "drizzle-orm";
import type { OAuthTokenSet } from "#/core/oauth";
import type { SecretCipher } from "../crypto";
import type { AppDatabase } from "../db/client";
import { connections } from "../db/schema";

export interface Connection {
	integrationId: string;
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date | null;
	scopes: string[];
	accountLabel: string | null;
	meta: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/** Token-free view of a connection, safe to send to the browser. */
export type ConnectionSummary = Pick<
	Connection,
	"integrationId" | "accountLabel" | "scopes" | "createdAt"
>;

export interface ConnectionRepository {
	get(integrationId: string): Promise<Connection | null>;
	list(): Promise<ConnectionSummary[]>;
	save(input: {
		integrationId: string;
		tokens: OAuthTokenSet;
		accountLabel: string | null;
		meta: Record<string, unknown>;
	}): Promise<void>;
	updateTokens(integrationId: string, tokens: OAuthTokenSet): Promise<void>;
	delete(integrationId: string): Promise<void>;
}

export function createDrizzleConnectionRepository(
	db: AppDatabase,
	cipher: SecretCipher,
): ConnectionRepository {
	const encryptTokens = (tokens: OAuthTokenSet) => ({
		accessToken: cipher.encrypt(tokens.accessToken),
		refreshToken: tokens.refreshToken
			? cipher.encrypt(tokens.refreshToken)
			: null,
		expiresAt: tokens.expiresAt,
		scopes: tokens.scopes,
	});

	return {
		async get(integrationId) {
			const row = db
				.select()
				.from(connections)
				.where(eq(connections.integrationId, integrationId))
				.get();
			if (!row) return null;
			return {
				...row,
				accessToken: cipher.decrypt(row.accessToken),
				refreshToken: row.refreshToken
					? cipher.decrypt(row.refreshToken)
					: null,
			};
		},

		async list() {
			return db
				.select({
					integrationId: connections.integrationId,
					accountLabel: connections.accountLabel,
					scopes: connections.scopes,
					createdAt: connections.createdAt,
				})
				.from(connections)
				.all();
		},

		async save({ integrationId, tokens, accountLabel, meta }) {
			const now = new Date();
			const values = {
				...encryptTokens(tokens),
				accountLabel,
				meta,
				updatedAt: now,
			};
			db.insert(connections)
				.values({ integrationId, createdAt: now, ...values })
				.onConflictDoUpdate({ target: connections.integrationId, set: values })
				.run();
		},

		async updateTokens(integrationId, tokens) {
			const encrypted = encryptTokens(tokens);
			db.update(connections)
				.set({
					...encrypted,
					// Some providers don't rotate refresh tokens: keep the old one.
					refreshToken: encrypted.refreshToken ?? undefined,
					updatedAt: new Date(),
				})
				.where(eq(connections.integrationId, integrationId))
				.run();
		},

		async delete(integrationId) {
			db.delete(connections)
				.where(eq(connections.integrationId, integrationId))
				.run();
		},
	};
}
