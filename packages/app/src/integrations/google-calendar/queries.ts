import { unwrap } from "@dashboard/core/result";
import type { WorkScope } from "@dashboard/core/work-scope";
import { queryOptions } from "@tanstack/react-query";
import { integrationQueryKey } from "#/lib/query-keys";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { fetchCalendarEvent, fetchUpcomingEvents } from "./fetchers";

const key = integrationQueryKey(GOOGLE_CALENDAR_ID);

export const googleCalendarQueries = {
	event: (id: string) =>
		queryOptions({
			queryKey: [...key, "event", id],
			queryFn: async () => unwrap(await fetchCalendarEvent(id)),
		}),
	upcoming: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "upcoming", scope],
			queryFn: async () => unwrap(await fetchUpcomingEvents(scope)),
		}),
};
