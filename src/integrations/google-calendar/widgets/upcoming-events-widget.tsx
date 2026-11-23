import { useQuery } from "@tanstack/react-query";
import { AgendaList } from "#/components/calendar/agenda-list";
import { QueryState } from "#/components/widget-kit/query-state";
import { useWorkScope } from "#/components/widget-kit/work-scope-context";
import { googleCalendarQueries } from "../queries";

export function UpcomingEventsWidget() {
	const scope = useWorkScope();
	const query = useQuery(googleCalendarQueries.upcoming(scope));
	return (
		<QueryState
			query={query}
			isEmpty={(events) => events.length === 0}
			emptyMessage="No upcoming events this week."
		>
			{(events) => <AgendaList events={events} />}
		</QueryState>
	);
}
