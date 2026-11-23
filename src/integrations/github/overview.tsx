import { useQuery } from "@tanstack/react-query";
import {
	FolderGit2,
	GitPullRequest,
	GitPullRequestDraft,
	Rocket,
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
import { formatRelative } from "#/lib/time";
import { SEARCH_PAGE_SIZE } from "./constants";
import { githubQueries } from "./queries";
import { PR_SIGNAL_LABELS } from "./service";

const upcoming = (releases: Release[]) =>
	releases.filter((r) => r.state === "upcoming");
const shipped = (releases: Release[]) =>
	releases.filter((r) => r.state === "released");
const count = (items: unknown[]) => cappedCount(items.length, SEARCH_PAGE_SIZE);

/** "2 need changes · 1 failing checks", or the draft count when all is well. */
function myPrHint(items: WorkItem[]): string {
	const has = (label: string) =>
		items.filter((i) => i.status?.includes(label)).length;
	const changes = has(PR_SIGNAL_LABELS.changes_requested);
	const failing = has(PR_SIGNAL_LABELS.checks_failing);
	const parts = [
		changes > 0 && `${changes} need${changes === 1 ? "s" : ""} changes`,
		failing > 0 && `${failing} failing checks`,
	].filter(Boolean);
	return parts.length > 0
		? parts.join(" · ")
		: `${items.filter((i) => i.status === "Draft").length} drafts`;
}

export function GitHubOverview() {
	const scope = useWorkScope();
	const reviews = useQuery(githubQueries.reviewRequests());
	const mine = useQuery(githubQueries.myPullRequests(scope));
	const releases = useQuery(githubQueries.releases());

	return (
		<div className="space-y-6">
			<StatGrid>
				<StatTile
					label="Review requests"
					icon={GitPullRequest}
					query={reviews}
					value={count}
					hint={(items) => {
						const oldest = items.at(-1);
						return oldest
							? `Oldest updated ${formatRelative(oldest.updatedAt)}`
							: "You're all caught up";
					}}
				/>
				<StatTile
					label="My open pull requests"
					icon={GitPullRequestDraft}
					query={mine}
					value={count}
					hint={myPrHint}
				/>
				<StatTile
					label="Upcoming releases"
					icon={Tag}
					query={releases}
					value={(r) => upcoming(r).length}
					hint={() => "Draft releases in your repos"}
				/>
				<StatTile
					label={`Shipped (${RECENT_RELEASE_DAYS} days)`}
					icon={Rocket}
					query={releases}
					value={(r) => shipped(r).length}
					hint={(r) => {
						const latest = shipped(r)[0];
						return latest ? `Latest: ${latest.name}` : "Nothing shipped";
					}}
				/>
			</StatGrid>

			<div className="grid gap-4 xl:grid-cols-2">
				<OverviewSection
					title="Review requests"
					icon={GitPullRequest}
					query={reviews}
					count={count}
					isEmpty={(items) => items.length === 0}
					emptyMessage="No reviews waiting on you."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="My pull requests"
					icon={GitPullRequestDraft}
					query={mine}
					count={count}
					isEmpty={(items) => items.length === 0}
					emptyMessage="No open pull requests for this filter."
				>
					{(items) => <WorkItemList items={items} />}
				</OverviewSection>
				<OverviewSection
					title="My pull requests by repository"
					icon={FolderGit2}
					query={mine}
					isEmpty={(items) => items.length === 0}
					emptyMessage="No open pull requests for this filter."
				>
					{(items) => <BreakdownList rows={tally(items, (i) => i.project)} />}
				</OverviewSection>
				<OverviewSection
					title="Releases"
					icon={Rocket}
					query={releases}
					count={(r) => r.length}
					isEmpty={(r) => r.length === 0}
					emptyMessage={`No drafts and nothing shipped in the last ${RECENT_RELEASE_DAYS} days.`}
				>
					{(r) => <ReleaseList releases={r} />}
				</OverviewSection>
			</div>
		</div>
	);
}
