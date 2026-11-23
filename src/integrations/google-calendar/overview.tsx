import { CalendarOverview } from "#/components/calendar/calendar-overview";
import { UPCOMING_DAYS } from "./constants";
import { googleCalendarQueries } from "./queries";

export function GoogleCalendarOverview() {
	return (
		<CalendarOverview
			upcoming={googleCalendarQueries.upcoming}
			days={UPCOMING_DAYS}
		/>
	);
}
