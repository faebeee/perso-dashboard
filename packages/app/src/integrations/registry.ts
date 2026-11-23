import type { IntegrationManifest } from "@dashboard/core/integration";
import { githubManifest } from "./github/manifest";
import { gmailManifest } from "./gmail/manifest";
import { googleCalendarManifest } from "./google-calendar/manifest";
import { jiraManifest } from "./jira/manifest";
import { outlookManifest } from "./outlook/manifest";
import { outlookCalendarManifest } from "./outlook-calendar/manifest";
import { sentryManifest } from "./sentry/manifest";

/**
 * UI-facing list of installed integrations.
 * To add one: create `integrations/<id>/` with the same shape, then add it
 * here and in `runtime-registry.ts`.
 */
export const integrationManifests: readonly IntegrationManifest[] = [
	githubManifest,
	jiraManifest,
	gmailManifest,
	googleCalendarManifest,
	outlookManifest,
	outlookCalendarManifest,
	sentryManifest,
];

export function getIntegrationManifest(id: string) {
	return integrationManifests.find((m) => m.id === id);
}
