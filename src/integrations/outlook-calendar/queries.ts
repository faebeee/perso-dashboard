import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";
import { OUTLOOK_CALENDAR_ID } from "./constants";
import { fetchOutlookEvent, fetchOutlookUpcomingEvents } from "./fetchers";

const key = integrationQueryKey(OUTLOOK_CALENDAR_ID);

export const outlookCalendarQueries = {
	event: (ref: string) =>
		queryOptions({
			queryKey: [...key, "event", ref],
			queryFn: async () => unwrap(await fetchOutlookEvent(ref)),
		}),
	upcoming: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "upcoming", scope],
			queryFn: async () => unwrap(await fetchOutlookUpcomingEvents(scope)),
		}),
};
