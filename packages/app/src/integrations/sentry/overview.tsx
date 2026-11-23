import type { WorkItem } from "@dashboard/core/work-item";
import { useQuery } from "@tanstack/react-query";
import { Bug, Flame, FolderKanban, Repeat, Sparkles } from "lucide-react";
import {
	BreakdownList,
	cappedCount,
	OverviewSection,
	StatGrid,
	StatTile,
} from "#/components/overview-kit/overview-kit";
import { WorkItemList } from "#/components/work-item/work-item-list";
import { tally } from "#/lib/tally";
import { formatRelative } from "#/lib/time";
import { ISSUE_PAGE_SIZE } from "./constants";
import { sentryQueries } from "./queries";

const count = (items: unknown[]) => cappedCount(items.length, ISSUE_PAGE_SIZE);
const isEmpty = (items: WorkItem[]) => items.length === 0;

export function SentryOverview() {
	const assigned = useQuery(sentryQueries.assigned());
	const fresh = useQuery(sentryQueries.newIssues());
	const escalating = useQuery(sentryQueries.escalating());
	const regressed = useQuery(sentryQueries.regressed());

	return (
		<div className="space-y-6">
			<StatGrid>
				<StatTile
					label="Assigned to you & your teams"
					icon={Bug}
					query={assigned}
					value={count}
					hint={(items) => {
						const hot = items.filter(
							(i) => i.status === "Escalating" || i.status === "Regressed",
						).length;
						return hot > 0
							? `${hot} escalating or regressed`
							: "None escalating";
					}}
				/>
				<StatTile
					label="New in your projects"
					icon={Sparkles}
					query={fresh}
					value={count}
					hint={(items) =>
						items[0]
							? `Latest seen ${formatRelative(items[0].updatedAt)}`
							: "Nothing new"
					}
				/>
				<StatTile
					label="Escalating"
					icon={Flame}
					query={escalating}
					value={count}
					hint={() => "Volume well above normal"}
				/>
				<StatTile
					label="Regressed"
					icon={Repeat}
					query={regressed}
					value={count}
					hint={() => "Resolved before, back again"}
				/>
			</StatGrid>

			<div className="grid gap-4 xl:grid-cols-2">
				<OverviewSection
					title="Assigned to you & your teams"
					icon={Bug}
					query={assigned}
					count={count}
					isEmpty={isEmpty}
					emptyMessage="No unresolved errors assigned to you."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="Escalating"
					icon={Flame}
					query={escalating}
					count={count}
					isEmpty={isEmpty}
					emptyMessage="Nothing is spiking right now."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="Assigned errors by project"
					icon={FolderKanban}
					query={assigned}
					isEmpty={isEmpty}
					emptyMessage="No unresolved errors assigned to you."
				>
					{(items) => <BreakdownList rows={tally(items, (i) => i.project)} />}
				</OverviewSection>
				<OverviewSection
					title="Regressed"
					icon={Repeat}
					query={regressed}
					count={count}
					isEmpty={isEmpty}
					emptyMessage="No regressions."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="New in your projects"
					icon={Sparkles}
					query={fresh}
					count={count}
					isEmpty={isEmpty}
					emptyMessage="No new errors."
					className="xl:col-span-2"
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
			</div>
		</div>
	);
}
