import type { IntegrationManifest } from "#/core/integration";
import { githubManifest } from "./github/manifest";
import { gmailManifest } from "./gmail/manifest";
import { googleCalendarManifest } from "./google-calendar/manifest";
import { jiraManifest } from "./jira/manifest";

/**
 * Client-safe list of installed integrations.
 * To add one: create `integrations/<id>/` with the same shape, then add it
 * here and in `registry.server.ts`.
 */
export const integrationManifests: readonly IntegrationManifest[] = [
	githubManifest,
	jiraManifest,
	gmailManifest,
	googleCalendarManifest,
];

export function getIntegrationManifest(id: string) {
	return integrationManifests.find((m) => m.id === id);
}
