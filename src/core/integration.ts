import type { ComponentType } from "react";
import type { AttentionItem } from "./attention";
import type {
	OAuthClientCredentials,
	OAuthClientRef,
	OAuthProvider,
} from "./oauth";
import type { Release, ReleaseQuery } from "./release";
import type { WidgetDefinition } from "./widget";
import type { WorkItem } from "./work-item";

/**
 * Description of an integration for the UI: identity, branding and the
 * widgets it contributes. Never references credentials or tokens.
 */
export interface IntegrationManifest {
	id: string;
	name: string;
	description: string;
	icon: ComponentType<{ className?: string }>;
	/** Brand colour (CSS colour) used to tint this source's items. */
	accent?: string;
	/** Where the user creates the OAuth app for this provider. */
	setup: { url: string; label: string };
	widgets: WidgetDefinition[];
	/** Full-page overview, listed in the sidebar. Omit for no page. */
	overview?: IntegrationOverview;
	/** In-app detail view for this source's items. Omit to open in the browser. */
	details?: ItemDetailView;
}

/**
 * Body of the detail modal for one item. The modal frame (title, "Open in…"
 * button) is shared; this renders everything below it and fetches its own
 * data from `detailRef`.
 */
export interface ItemDetailView {
	Component: ComponentType<{ detailRef: string }>;
}

/** A source's own page: headline numbers plus detailed sections. */
export interface IntegrationOverview {
	Component: ComponentType;
	/** True when the page responds to the "All / Assigned / Created" filter. */
	scoped?: boolean;
}

/** What a connected integration needs to call its provider API. */
export interface IntegrationContext {
	accessToken: string;
	/** Integration-specific data captured at connect time (e.g. Jira cloudId). */
	meta: Record<string, unknown>;
}

export interface AccountInfo {
	/** Human-readable label, e.g. GitHub login or email address. */
	label: string;
	meta?: Record<string, unknown>;
}

/**
 * Data-access half of an integration: OAuth and provider calls. Lives in
 * `integration.ts` files; the UI reaches it only through `fetchers.ts`.
 */
export interface IntegrationBackend {
	id: string;
	/** The OAuth app this integration authenticates with (may be shared). */
	oauthClient: OAuthClientRef;
	createOAuthProvider(
		credentials: OAuthClientCredentials,
		redirectUri: string,
	): OAuthProvider;
	/** Called once right after OAuth to label the account and capture meta. */
	describeAccount(ctx: IntegrationContext): Promise<AccountInfo>;
	/** Items for the unified feed. Omit when the data isn't "work" (e.g. calendar). */
	getFeedItems?(ctx: IntegrationContext): Promise<WorkItem[]>;
	/**
	 * What needs the user's attention soon (urgent view). Omit if nothing from
	 * this provider is ever urgent. `now` is injected for testability.
	 */
	getAttentionItems?(
		ctx: IntegrationContext,
		now: Date,
	): Promise<AttentionItem[]>;
	/** Releases for the combined releases widget. Omit if the provider has none. */
	getReleases?(
		ctx: IntegrationContext,
		query: ReleaseQuery,
	): Promise<Release[]>;
}
