import { useQuery } from "@tanstack/react-query";
import { EventDetailBody } from "#/components/calendar/event-detail";
import { QueryState } from "#/components/widget-kit/query-state";
import { outlookCalendarQueries } from "./queries";

/** Detail modal body for a calendar event (`detailRef` = Graph event ref). */
export function OutlookEventDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(outlookCalendarQueries.event(detailRef));
	return (
		<QueryState query={query}>
			{(event) => <EventDetailBody event={event} />}
		</QueryState>
	);
}
