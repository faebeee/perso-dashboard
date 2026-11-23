import { createHttpClient, type FetchFn } from "#/platform/http";
import { ISSUE_PAGE_SIZE, SENTRY_BASE_URL, SENTRY_ID } from "../constants";
import { sentryIssueListSchema, sentryOrganizationListSchema } from "./schemas";

/**
 * Region hosts come from API responses; only ever send the token to Sentry
 * itself. Anything else falls back to sentry.io.
 */
export function safeRegionUrl(regionUrl: string | undefined): string {
	if (!regionUrl) return SENTRY_BASE_URL;
	try {
		const url = new URL(regionUrl);
		const trusted =
			url.protocol === "https:" &&
			(url.hostname === "sentry.io" || url.hostname.endsWith(".sentry.io"));
		return trusted ? url.origin : SENTRY_BASE_URL;
	} catch {
		return SENTRY_BASE_URL;
	}
}

/** Thin, typed wrapper over the Sentry REST API (v0). */
export function createSentryApi(accessToken: string, fetch?: FetchFn) {
	const http = createHttpClient({
		integrationId: SENTRY_ID,
		baseUrl: SENTRY_BASE_URL,
		accessToken,
		fetch,
	});

	return {
		/** Organizations you're a member of (with their region URL). */
		organizations: () =>
			http.get("/api/0/organizations/", sentryOrganizationListSchema, {
				member: "1",
			}),

		/** Issues of one org, in the projects you're a member of. */
		issues: (
			org: { slug: string; apiUrl: string },
			query: string,
			sort: "date" | "freq" | "new" = "date",
		) =>
			http.get(
				`${safeRegionUrl(org.apiUrl)}/api/0/organizations/${encodeURIComponent(org.slug)}/issues/`,
				sentryIssueListSchema,
				{ query, sort, limit: ISSUE_PAGE_SIZE, statsPeriod: "24h" },
			),
	};
}

export type SentryApi = ReturnType<typeof createSentryApi>;
