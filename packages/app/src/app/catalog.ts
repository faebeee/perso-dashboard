import type { WidgetDefinition } from "@dashboard/core/widget";
import { createAttentionWidget } from "#/features/attention/widget";
import type { WidgetPlacement } from "#/features/dashboard/model";
import { createFeedWidget } from "#/features/feed/widget";
import { createReleasesWidget } from "#/features/releases/widget";
import {
	getIntegrationManifest,
	integrationManifests,
} from "#/integrations/registry";

/**
 * Composition: the set of widgets the dashboard offers. Features never
 * import each other, so they're wired together here instead.
 */
export const widgetCatalog: readonly WidgetDefinition[] = [
	createAttentionWidget(),
	createFeedWidget(),
	createReleasesWidget(),
	...integrationManifests.flatMap((manifest) => manifest.widgets),
];

export const widgetGroupLabel = (integrationId: string | undefined) =>
	integrationId
		? (getIntegrationManifest(integrationId)?.name ?? integrationId)
		: "General";

/**
 * The dashboard new users start with and "Reset layout" restores (12-column
 * grid). Row 1: what needs you now; row 2: your work; row 3: inbox, activity
 * and security. Widgets of unknown types are skipped.
 */
export const defaultDashboard: readonly WidgetPlacement[] = [
	{ type: "core.attention", x: 0, y: 0, w: 4, h: 10 },
	{ type: "github.review-requests", x: 4, y: 0, w: 4, h: 10 },
	{ type: "google-calendar.upcoming", x: 8, y: 0, w: 4, h: 10 },
	{ type: "github.my-pull-requests", x: 0, y: 10, w: 4, h: 8 },
	{ type: "jira.assigned-to-me", x: 4, y: 10, w: 4, h: 8 },
	{ type: "sentry.assigned", x: 8, y: 10, w: 4, h: 8 },
	{ type: "gmail.unread", x: 0, y: 18, w: 4, h: 12 },
	{ type: "core.feed", x: 4, y: 18, w: 4, h: 12 },
	{ type: "github.dependabot", x: 8, y: 18, w: 4, h: 12 },
];
