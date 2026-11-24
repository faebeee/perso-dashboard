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

/** OAuth apps the user registered, keyed by OAuthClientRef.id ("google"…). */
export const oauthClients = sqliteTable("oauth_clients", {
	id: text("id").primaryKey(),
	clientId: text("client_id").notNull(),
	/** Encrypted with SecretCipher. */
	clientSecret: text("client_secret").notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** API keys for LLM providers, keyed by provider id ("anthropic"…). */
export const llmCredentials = sqliteTable("llm_credentials", {
	providerId: text("provider_id").primaryKey(),
	/** Encrypted with SecretCipher. */
	apiKey: text("api_key").notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const dashboardLayouts = sqliteTable("dashboard_layouts", {
	id: text("id").primaryKey(),
	items: text("items", { mode: "json" }).$type<unknown>().notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Urgent items you marked done or snoozed. A "done" item comes back when its
 * fingerprint changes (it escalated); a snoozed one when `until` passes.
 */
export const itemDismissals = sqliteTable("item_dismissals", {
	itemId: text("item_id").primaryKey(),
	mode: text("mode", { enum: ["done", "snoozed"] }).notNull(),
	until: integer("until", { mode: "timestamp_ms" }),
	fingerprint: text("fingerprint").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Your personal list for the day: pinned items and quick notes. */
export const todayItems = sqliteTable("today_items", {
	id: text("id").primaryKey(),
	kind: text("kind", { enum: ["note", "item"] }).notNull(),
	title: text("title").notNull(),
	/** Pinned item only: where it came from and how to open it. */
	source: text("source"),
	itemKind: text("item_kind"),
	itemId: text("item_id"),
	url: text("url"),
	detailRef: text("detail_ref"),
	/** Repository or project of the pinned item (daily review filter). */
	project: text("project"),
	done: integer("done", { mode: "boolean" }).notNull().default(false),
	doneAt: integer("done_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Cached API responses (see platform/http-cache.ts). Bodies are encrypted:
 * they contain mail, issues and calendar data.
 */
export const httpCache = sqliteTable("http_cache", {
	key: text("key").primaryKey(),
	integrationId: text("integration_id").notNull(),
	/** Encrypted with SecretCipher. */
	body: text("body").notNull(),
	etag: text("etag"),
	lastModified: text("last_modified"),
	fetchedAt: integer("fetched_at").notNull(),
});

/**
 * Generated AI summaries of the Daily Review, keyed by a hash of what was
 * sent (provider, model, instructions, review). Reused while the review is
 * unchanged, so the model isn't asked twice for the same answer.
 */
export const aiSummaries = sqliteTable("ai_summaries", {
	key: text("key").primaryKey(),
	/** Which review it belongs to (period + filter), for "outdated" summaries. */
	scope: text("scope").notNull(),
	/** Encrypted with SecretCipher: it describes your work. */
	text: text("text").notNull(),
	providerId: text("provider_id").notNull(),
	model: text("model").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
