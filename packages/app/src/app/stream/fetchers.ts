import type { IntegrationError } from "@dashboard/core/result";
import { fetchFeed } from "#/features/feed/fetchers";
import { fetchActivity } from "#/features/insights/fetchers";
import { STREAM_WINDOW_MS, type StreamEvent } from "#/features/stream/stream";
import { eventsFromActivity, eventsFromWorkItems } from "./stream-events";

export interface StreamData {
	events: StreamEvent[];
	errors: IntegrationError[];
}

const startOfDay = (ms: number) => {
	const day = new Date(ms);
	day.setHours(0, 0, 0, 0);
	return day;
};

/**
 * Pure: the activity range. Whole days, so the requests (and their cache
 * entries) stay the same all day while the stream polls every minute.
 */
export function activityRange(now: number): { from: Date; to: Date } {
	const from = startOfDay(now - STREAM_WINDOW_MS);
	const to = startOfDay(now);
	to.setDate(to.getDate() + 1);
	return { from, to };
}

/** Everything that changed lately: the feed's items plus what you did. */
export async function fetchStream(now = Date.now()): Promise<StreamData> {
	const { from, to } = activityRange(now);
	const [feed, activity] = await Promise.all([
		fetchFeed(),
		fetchActivity(from, to),
	]);
	return {
		events: [
			// Activity first: it says more ("You merged") than "updated".
			...eventsFromActivity(activity.items),
			...eventsFromWorkItems(feed.items),
		],
		errors: [...feed.errors, ...activity.errors].filter(
			(error, i, all) =>
				all.findIndex(
					(e) =>
						e.integrationId === error.integrationId && e.kind === error.kind,
				) === i,
		),
	};
}
