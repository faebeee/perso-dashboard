import "@tanstack/react-start/server-only";
import type { IntegrationServer } from "#/core/integration";
import { githubServer } from "./github/integration.server";
import { gmailServer } from "./gmail/integration.server";
import { googleCalendarServer } from "./google-calendar/integration.server";
import { jiraServer } from "./jira/integration.server";

/** Server-side counterpart of `registry.ts`. Keep both lists in sync. */
export const integrationServers: readonly IntegrationServer[] = [
	githubServer,
	jiraServer,
	gmailServer,
	googleCalendarServer,
];

export function getIntegrationServer(
	id: string,
): IntegrationServer | undefined {
	return integrationServers.find((s) => s.id === id);
}
