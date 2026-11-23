import { useQuery } from "@tanstack/react-query";
import {
	CalendarClock,
	CalendarDays,
	Clock,
	MailQuestion,
	Sun,
} from "lucide-react";
import { AgendaList } from "#/components/calendar/agenda-list";
import {
	BreakdownList,
	OverviewSection,
	StatGrid,
	StatTile,
} from "#/components/overview-kit/overview-kit";
import { useWorkScope } from "#/components/widget-kit/work-scope-context";
import { formatDuration, formatRelative } from "#/lib/time";
import { UPCOMING_DAYS } from "./constants";
import { googleCalendarQueries } from "./queries";
import { summarizeEvents } from "./summary";

export function GoogleCalendarOverview() {
	const scope = useWorkScope();
	const now = Date.now();
	const summary = useQuery({
		...googleCalendarQueries.upcoming(scope),
		select: (events) => summarizeEvents(events, now),
	});

	return (
		<div className="space-y-6">
			<StatGrid>
				<StatTile
					label="Today"
					icon={Sun}
					query={summary}
					value={(s) => s.today.length}
					hint={(s) =>
						`${s.today.filter((e) => Date.parse(e.start) > now).length} still to come`
					}
				/>
				<StatTile
					label="Next up"
					icon={CalendarClock}
					query={summary}
					value={(s) => (s.next ? formatRelative(s.next.start, now) : "—")}
					hint={(s) =>
						s.next?.title ?? `Nothing in the next ${UPCOMING_DAYS} days`
					}
				/>
				<StatTile
					label={`In meetings (${UPCOMING_DAYS} days)`}
					icon={Clock}
					query={summary}
					value={(s) => formatDuration(s.meetingMinutes)}
					hint={(s) => `${s.meetingCount} meetings`}
				/>
				<StatTile
					label="Awaiting your reply"
					icon={MailQuestion}
					query={summary}
					value={(s) => s.awaitingReply}
					hint={(s) =>
						s.awaitingReply > 0 ? "Invitations to answer" : "All answered"
					}
				/>
			</StatGrid>

			<div className="grid gap-4 xl:grid-cols-2">
				<OverviewSection
					title="Today"
					icon={Sun}
					query={summary}
					count={(s) => s.today.length}
					isEmpty={(s) => s.today.length === 0}
					emptyMessage="Nothing else on your calendar today."
				>
					{(s) => <AgendaList events={s.today} now={now} />}
				</OverviewSection>
				<OverviewSection
					title="Meeting time per day"
					icon={Clock}
					query={summary}
					isEmpty={(s) => s.meetingMinutes === 0}
					emptyMessage="No meetings coming up."
				>
					{(s) => (
						<BreakdownList
							rows={s.minutesByDay}
							format={formatDuration}
							limit={UPCOMING_DAYS + 1}
						/>
					)}
				</OverviewSection>
				<OverviewSection
					title={`Next ${UPCOMING_DAYS} days`}
					icon={CalendarDays}
					query={summary}
					count={(s) => s.later.length}
					isEmpty={(s) => s.later.length === 0}
					emptyMessage="Nothing scheduled after today."
					className="xl:col-span-2"
				>
					{(s) => <AgendaList events={s.later} now={now} />}
				</OverviewSection>
			</div>
		</div>
	);
}
