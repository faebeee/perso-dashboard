import type { WidgetDefinition } from "#/core/widget";
import { createAttentionWidget } from "#/features/attention/widget";
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
