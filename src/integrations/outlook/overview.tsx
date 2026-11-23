import { useQuery } from "@tanstack/react-query";
import { Flag, Inbox, Mail, MailWarning, Users } from "lucide-react";
import {
	BreakdownList,
	cappedCount,
	OverviewSection,
	StatGrid,
	StatTile,
} from "#/components/overview-kit/overview-kit";
import { WorkItemList } from "#/components/work-item/work-item-list";
import type { WorkItem } from "#/core/work-item";
import { tally } from "#/lib/tally";
import { MESSAGE_PAGE_SIZE } from "./constants";
import { outlookQueries } from "./queries";

const important = (items: WorkItem[]) =>
	items.filter((i) => i.tags?.includes("Important"));
const listCount = (items: unknown[]) =>
	cappedCount(items.length, MESSAGE_PAGE_SIZE);

export function OutlookOverview() {
	const stats = useQuery(outlookQueries.inboxStats());
	const unread = useQuery(outlookQueries.unread());
	const flagged = useQuery(outlookQueries.flagged());

	return (
		<div className="space-y-6">
			<StatGrid>
				<StatTile
					label="Unread"
					icon={Mail}
					query={stats}
					value={(s) => s.unread.toLocaleString()}
					hint={(s) =>
						s.inbox > 0
							? `${Math.round((s.unread / s.inbox) * 100)}% of your inbox`
							: "Inbox is empty"
					}
				/>
				<StatTile
					label="In your inbox"
					icon={Inbox}
					query={stats}
					value={(s) => s.inbox.toLocaleString()}
				/>
				<StatTile
					label="Flagged"
					icon={Flag}
					query={stats}
					value={(s) => s.flagged.toLocaleString()}
				/>
				<StatTile
					label="Important & unread"
					icon={MailWarning}
					query={unread}
					value={(items) => important(items).length}
					hint={() => `Among the latest ${MESSAGE_PAGE_SIZE} unread`}
				/>
			</StatGrid>

			<div className="grid gap-4 xl:grid-cols-2">
				<OverviewSection
					title="Unread"
					icon={Mail}
					query={unread}
					count={listCount}
					isEmpty={(items) => items.length === 0}
					emptyMessage="Inbox zero. 🎉"
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="Who's waiting on you"
					icon={Users}
					query={unread}
					isEmpty={(items) => items.length === 0}
					emptyMessage="No unread mail."
				>
					{(items) => (
						<BreakdownList rows={tally(items, (i) => i.actor?.name)} />
					)}
				</OverviewSection>
				<OverviewSection
					title="Flagged"
					icon={Flag}
					query={flagged}
					count={listCount}
					isEmpty={(items) => items.length === 0}
					emptyMessage="Nothing flagged."
					className="xl:col-span-2"
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
			</div>
		</div>
	);
}
