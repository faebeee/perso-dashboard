import type { IntegrationBackend } from "#/core/integration";
import { githubBackend } from "./github/integration";
import { gmailBackend } from "./gmail/integration";
import { googleCalendarBackend } from "./google-calendar/integration";
import { jiraBackend } from "./jira/integration";

/** Data-access counterpart of `registry.ts` (manifests). Keep both lists in sync. */
export const integrationBackends: readonly IntegrationBackend[] = [
	githubBackend,
	jiraBackend,
	gmailBackend,
	googleCalendarBackend,
];

export function getIntegrationBackend(
	id: string,
): IntegrationBackend | undefined {
	return integrationBackends.find((s) => s.id === id);
}
