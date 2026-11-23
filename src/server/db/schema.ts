import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** One row per connected integration (single-user app). */
export const connections = sqliteTable("connections", {
	integrationId: text("integration_id").primaryKey(),
	/** Encrypted with SecretCipher. */
	accessToken: text("access_token").notNull(),
	/** Encrypted with SecretCipher. */
	refreshToken: text("refresh_token"),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
	scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
	accountLabel: text("account_label"),
	meta: text("meta", { mode: "json" })
		.$type<Record<string, unknown>>()
		.notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const dashboardLayouts = sqliteTable("dashboard_layouts", {
	id: text("id").primaryKey(),
	items: text("items", { mode: "json" }).$type<unknown>().notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
