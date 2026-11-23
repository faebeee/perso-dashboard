import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query-keys";
import { fetchMeetingPrep, fetchWaiting } from "./fetchers";

export const waitingQueries = {
	all: () =>
		queryOptions({
			queryKey: [...queryKeys.combined, "waiting"],
			queryFn: () => fetchWaiting(),
		}),
	meetingPrep: () =>
		queryOptions({
			queryKey: [...queryKeys.combined, "meeting-prep"],
			queryFn: () => fetchMeetingPrep(),
		}),
};
