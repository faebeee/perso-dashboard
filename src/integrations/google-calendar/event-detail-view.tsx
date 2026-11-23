import { useQuery } from "@tanstack/react-query";
import { EventDetailBody } from "#/components/calendar/event-detail";
import { QueryState } from "#/components/widget-kit/query-state";
import { googleCalendarQueries } from "./queries";

/** Detail modal body for a calendar event (`detailRef` = Google event ref). */
export function EventDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(googleCalendarQueries.event(detailRef));
	return (
		<QueryState query={query}>
			{(event) => <EventDetailBody event={event} />}
		</QueryState>
	);
}
