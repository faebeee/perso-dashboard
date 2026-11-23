import type { ComponentType } from "react";
import {
	type AttentionItem,
	type AttentionRules,
	DEFAULT_ATTENTION_RULES,
} from "./attention";
import type { CalendarEvent } from "./calendar-event";
import type { ActivityItem, MetricSeries, WeekRange } from "./insights";
import type {
	OAuthClientCredentials,
	OAuthClientRef,
	OAuthProvider,
} from "./oauth";
import type { Release, ReleaseQuery } from "./release";
import {
	DEFAULT_WAITING_RULES,
	type WaitingItem,
	type WaitingRules,
} from "./waiting";
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
	/** Step-by-step instructions for creating the OAuth app (setup wizard). */
	setupGuide?: SetupGuide;
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

/** One step of creating a provider's OAuth app. */
export interface SetupStep {
	title: string;
	/** Plain text; blank lines separate paragraphs. */
	text: string;
	links?: { label: string; url: string }[];
	/** Values to paste into the provider's form. `{redirectUri}` is filled in. */
	copy?: { label: string; value: string }[];
}

export interface SetupGuide {
	steps: SetupStep[];
}

/** Placeholder in guide values for this app's OAuth redirect URI. */
export const REDIRECT_URI_PLACEHOLDER = "{redirectUri}";

/** Pure: fills in the redirect URI wherever a guide asks for it. */
export function resolveSetupGuide(
	guide: SetupGuide,
	redirectUri: string,
): SetupGuide {
	const fill = (text: string) =>
		text.split(REDIRECT_URI_PLACEHOLDER).join(redirectUri);
	return {
		steps: guide.steps.map((step) => ({
			...step,
			text: fill(step.text),
			copy: step.copy?.map((c) => ({ ...c, value: fill(c.value) })),
		})),
	};
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
	/** The user's current rules (Preferences); defaults when absent. */
	rules?: { attention: AttentionRules; waiting: WaitingRules };
	/** Values of this integration's `settings`, resolved with defaults. */
	settings?: Record<string, unknown>;
}

/** The rules to apply for a request (defaults outside the app, e.g. tests). */
export function rulesOf(ctx: IntegrationContext): {
	attention: AttentionRules;
	waiting: WaitingRules;
} {
	return (
		ctx.rules ?? {
			attention: DEFAULT_ATTENTION_RULES,
			waiting: DEFAULT_WAITING_RULES,
		}
	);
}

interface SettingBase {
	key: string;
	label: string;
	description: string;
	/** Values stored as strings (both types). */
	default: string[];
}

/** Free text values, edited as a comma-separated list. */
export interface StringListSetting extends SettingBase {
	type: "string-list";
}

/**
 * Pick any of the provider's options (calendars, projects…). Options come
 * from `IntegrationBackend.loadSettingOptions`, so the account must be
 * connected to edit it.
 */
export interface ChoiceListSetting extends SettingBase {
	type: "choice-list";
	/** At least this many must stay selected. */
	minSelected?: number;
}

/** A user-editable, integration-specific setting (shown in Preferences). */
export type IntegrationSetting = StringListSetting | ChoiceListSetting;

/** One choice of a `choice-list` setting. */
export interface SettingOption {
	value: string;
	label: string;
	description?: string;
	/** CSS colour shown as a swatch (e.g. the calendar's colour). */
	color?: string;
	/** Short tag such as "Primary". */
	badge?: string;
}

/** Reads a string-list setting's value, falling back to its default. */
export function stringListSetting(
	settings: Record<string, unknown> | undefined,
	setting: IntegrationSetting,
): string[] {
	const value = settings?.[setting.key];
	return Array.isArray(value) &&
		value.length > 0 &&
		value.every((v) => typeof v === "string")
		? value
		: setting.default;
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
	/** User-editable settings for this integration (Preferences). */
	settings?: IntegrationSetting[];
	/** Options for a `choice-list` setting, read from the connected account. */
	loadSettingOptions?(
		ctx: IntegrationContext,
		key: string,
	): Promise<SettingOption[]>;
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
	/** What you did between two moments (Insights summary / standup). */
	getActivity?(
		ctx: IntegrationContext,
		range: { from: Date; to: Date },
	): Promise<ActivityItem[]>;
	/** Weekly series for Insights trends, one value per requested week. */
	getMetrics?(
		ctx: IntegrationContext,
		weeks: WeekRange[],
		now: Date,
	): Promise<MetricSeries[]>;
	/** What you're waiting on others for (Waiting page). */
	getWaitingItems?(ctx: IntegrationContext, now: Date): Promise<WaitingItem[]>;
	/**
	 * Recent items involving these people (email addresses), for meeting
	 * prep: e.g. conversations with the attendees.
	 */
	getRelatedToPeople?(
		ctx: IntegrationContext,
		people: string[],
		since: Date,
	): Promise<WorkItem[]>;
	/** Your calendar between two moments (briefing, free time). Calendars only. */
	getAgenda?(
		ctx: IntegrationContext,
		range: { from: Date; to: Date },
	): Promise<CalendarEvent[]>;
	/** Releases for the combined releases widget. Omit if the provider has none. */
	getReleases?(
		ctx: IntegrationContext,
		query: ReleaseQuery,
	): Promise<Release[]>;
}
