import { CalendarOverview } from "#/components/calendar/calendar-overview";
import { UPCOMING_DAYS } from "./constants";
import { outlookCalendarQueries } from "./queries";

export function OutlookCalendarOverview() {
	return (
		<CalendarOverview
			upcoming={outlookCalendarQueries.upcoming}
			days={UPCOMING_DAYS}
		/>
	);
}
