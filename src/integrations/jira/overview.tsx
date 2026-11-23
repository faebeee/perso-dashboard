import { useQuery } from "@tanstack/react-query";
import {
	CircleDot,
	FolderKanban,
	ListChecks,
	Rocket,
	SquareKanban,
	Tag,
} from "lucide-react";
import {
	BreakdownList,
	cappedCount,
	OverviewSection,
	StatGrid,
	StatTile,
} from "#/components/overview-kit/overview-kit";
import { ReleaseList } from "#/components/release/release-list";
import { useWorkScope } from "#/components/widget-kit/work-scope-context";
import { WorkItemList } from "#/components/work-item/work-item-list";
import { RECENT_RELEASE_DAYS, type Release } from "#/core/release";
import type { WorkItem } from "#/core/work-item";
import { tally } from "#/lib/tally";
import { JIRA_ID, JIRA_RELEASE_STATUSES, SEARCH_PAGE_SIZE } from "./constants";
import { jiraQueries } from "./queries";

const SOURCES = { [JIRA_ID]: { name: "Jira", icon: SquareKanban } };
const DAY_MS = 24 * 60 * 60 * 1000;
const count = (items: unknown[]) => cappedCount(items.length, SEARCH_PAGE_SIZE);
const upcoming = (releases: Release[]) =>
	releases.filter((r) => r.state === "upcoming");
const updatedToday = (items: WorkItem[]) =>
	items.filter((i) => Date.now() - Date.parse(i.updatedAt) < DAY_MS).length;

export function JiraOverview() {
	const scope = useWorkScope();
	const issues = useQuery(jiraQueries.myIssues(scope));
	const onRelease = useQuery(jiraQueries.onRelease(scope));
	const releases = useQuery(jiraQueries.releases());

	return (
		<div className="space-y-6">
			<StatGrid>
				<StatTile
					label="Open issues"
					icon={SquareKanban}
					query={issues}
					value={count}
					hint={(items) => `${updatedToday(items)} updated in the last 24h`}
				/>
				<StatTile
					label="Ready for release"
					icon={Rocket}
					query={onRelease}
					value={count}
					hint={() => JIRA_RELEASE_STATUSES.join(" / ")}
				/>
				<StatTile
					label="Upcoming versions"
					icon={Tag}
					query={releases}
					value={(r) => upcoming(r).length}
					hint={(r) => {
						const overdue = r.filter((v) => v.tags.includes("Overdue")).length;
						return overdue > 0 ? `${overdue} overdue` : "None overdue";
					}}
				/>
				<StatTile
					label={`Released (${RECENT_RELEASE_DAYS} days)`}
					icon={ListChecks}
					query={releases}
					value={(r) => r.length - upcoming(r).length}
				/>
			</StatGrid>

			<div className="grid gap-4 xl:grid-cols-2">
				<OverviewSection
					title="My issues"
					icon={SquareKanban}
					query={issues}
					count={count}
					isEmpty={(items) => items.length === 0}
					emptyMessage="No open issues for this filter."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<div className="grid content-start gap-4">
					<OverviewSection
						title="By status"
						icon={CircleDot}
						query={issues}
						isEmpty={(items) => items.length === 0}
						emptyMessage="No open issues for this filter."
					>
						{(items) => (
							<BreakdownList rows={tally(items, (i) => i.status)} limit={6} />
						)}
					</OverviewSection>
					<OverviewSection
						title="By project"
						icon={FolderKanban}
						query={issues}
						isEmpty={(items) => items.length === 0}
						emptyMessage="No open issues for this filter."
					>
						{(items) => (
							<BreakdownList rows={tally(items, (i) => i.project)} limit={6} />
						)}
					</OverviewSection>
				</div>
				<OverviewSection
					title="Ready for release"
					icon={Rocket}
					query={onRelease}
					count={count}
					isEmpty={(items) => items.length === 0}
					emptyMessage="Nothing waiting for release right now."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="Versions"
					icon={Tag}
					query={releases}
					count={(r) => r.length}
					isEmpty={(r) => r.length === 0}
					emptyMessage={`No upcoming versions and nothing released in the last ${RECENT_RELEASE_DAYS} days.`}
				>
					{(r) => <ReleaseList releases={r} sources={SOURCES} />}
				</OverviewSection>
			</div>
		</div>
	);
}
