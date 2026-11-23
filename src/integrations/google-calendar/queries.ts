import { queryOptions } from "@tanstack/react-query";
import { unwrap } from "#/core/result";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";
import { GOOGLE_CALENDAR_ID } from "./constants";
import { fetchUpcomingEvents } from "./fetchers";

const key = integrationQueryKey(GOOGLE_CALENDAR_ID);

export const googleCalendarQueries = {
	upcoming: (scope: WorkScope) =>
		queryOptions({
			queryKey: [...key, "upcoming", scope],
			queryFn: async () => unwrap(await fetchUpcomingEvents(scope)),
		}),
};
