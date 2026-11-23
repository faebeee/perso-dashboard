import { IntegrationFailure } from "#/core/result";
import type { WorkItem } from "#/core/work-item";
import { settleLeniently } from "#/lib/collect-sources";
import { type SentryApi, safeRegionUrl } from "./api/client";
import {
	type SentryIssueInOrg,
	type SentryMeta,
	type SentryOrg,
	sentryMetaSchema,
} from "./api/schemas";
import { ORG_LIMIT, SENTRY_ID, SENTRY_QUERIES } from "./constants";
import { type SentryErrorDetail, toErrorDetail } from "./detail";
import { toWorkItem } from "./mapper";

type Order = "lastSeen" | "firstSeen" | "events";

const ORDER: Record<
	Order,
	(a: SentryIssueInOrg, b: SentryIssueInOrg) => number
> = {
	lastSeen: (a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen),
	firstSeen: (a, b) => Date.parse(b.firstSeen) - Date.parse(a.firstSeen),
	events: (a, b) => Number(b.count) - Number(a.count),
};

const SENTRY_SORT: Record<Order, "date" | "new" | "freq"> = {
	lastSeen: "date",
	firstSeen: "new",
	events: "freq",
};

/** Use-cases on top of the raw API, across all of your organizations. */
export function createSentryService(
	api: SentryApi,
	orgs: readonly SentryOrg[],
) {
	/** One org failing (e.g. no access) doesn't hide the others. */
	async function search(
		query: string,
		order: Order,
	): Promise<SentryIssueInOrg[]> {
		const perOrg = await settleLeniently(
			orgs.slice(0, ORG_LIMIT).map(async (org) =>
				(await api.issues(org, query, SENTRY_SORT[order])).map((issue) => ({
					...issue,
					orgSlug: org.slug,
				})),
			),
		);
		return perOrg.flat().sort(ORDER[order]);
	}
	const items = async (query: string, order: Order): Promise<WorkItem[]> =>
		(await search(query, order)).map(toWorkItem);

	return {
		/** Raw, for the urgent rules (they need substatus, level, assignee type). */
		assignedIssues: () => search(SENTRY_QUERIES.assigned, "lastSeen"),

		/** Everything for the error detail view (`detailRef` = "org:issueId"). */
		async errorDetail(ref: string): Promise<SentryErrorDetail> {
			const [slug, id] = ref.split(":");
			const org = orgs.find((o) => o.slug === slug);
			if (!org || !id)
				throw new Error(`Unknown Sentry issue reference: ${ref}`);
			const [issue, event] = await Promise.all([
				api.issue(org, id),
				// Old issues may have no retained events: show the issue anyway.
				api.latestEvent(org, id).catch(() => null),
			]);
			return toErrorDetail(issue, event);
		},

		assigned: () => items(SENTRY_QUERIES.assigned, "lastSeen"),
		assignedToMe: () => items(SENTRY_QUERIES.assignedToMe, "lastSeen"),
		newIssues: () => items(SENTRY_QUERIES.new, "firstSeen"),
		escalating: () => items(SENTRY_QUERIES.escalating, "events"),
		regressed: () => items(SENTRY_QUERIES.regressed, "lastSeen"),
	};
}

/** Organizations (and their API host) are captured at connect time. */
export async function resolveSentryAccount(
	api: SentryApi,
): Promise<SentryMeta> {
	const orgs = await api.organizations();
	if (orgs.length === 0) {
		throw new Error("This Sentry account isn't a member of any organization");
	}
	return {
		organizations: orgs.map((org) => ({
			slug: org.slug,
			name: org.name,
			apiUrl: safeRegionUrl(org.links?.regionUrl),
		})),
	};
}

export function readSentryMeta(meta: Record<string, unknown>): SentryMeta {
	const parsed = sentryMetaSchema.safeParse(meta);
	if (!parsed.success) {
		throw new IntegrationFailure({
			kind: "unauthorized",
			integrationId: SENTRY_ID,
			message:
				"No Sentry organization stored for this connection. Reconnect Sentry.",
		});
	}
	return parsed.data;
}

/** "Acme" or "Acme +2". */
export function accountLabel(meta: SentryMeta): string {
	const [first, ...rest] = meta.organizations;
	return rest.length > 0
		? `${first?.name} +${rest.length}`
		: (first?.name ?? "Sentry");
}
