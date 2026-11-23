import { Badge } from "@dashboard/ui/components/badge";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
	DetailSection,
	Meta,
	MetaGrid,
	PersonChip,
} from "#/components/item-detail/detail-kit";
import { SafeHtmlFrame } from "#/components/item-detail/safe-html-frame";
import { QueryState } from "#/components/widget-kit/query-state";
import { formatRelative, localDayKey } from "#/lib/time";
import type { JiraIssueDetail } from "./detail";
import { jiraQueries } from "./queries";

/** Detail modal body for a Jira issue (`detailRef` = issue key). */
export function JiraIssueDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(jiraQueries.issueDetail(detailRef));
	return (
		<QueryState query={query}>
			{(issue) => <IssueDetail issue={issue} />}
		</QueryState>
	);
}

function IssueDetail({ issue }: { issue: JiraIssueDetail }) {
	return (
		<div>
			<div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
				<span className="font-mono text-muted-foreground">{issue.key}</span>
				{issue.type && <Badge variant="outline">{issue.type}</Badge>}
				{issue.status && <Badge>{issue.status}</Badge>}
				{issue.labels.map((label) => (
					<Badge key={label} variant="secondary">
						{label}
					</Badge>
				))}
			</div>

			<MetaGrid>
				<Meta label="Assignee">
					<PersonChip person={issue.assignee} fallback="Unassigned" />
				</Meta>
				<Meta label="Reporter">
					<PersonChip person={issue.reporter} />
				</Meta>
				<Meta label="Priority">{issue.priority ?? "—"}</Meta>
				<Meta label="Due">
					<DueDate date={issue.dueDate} />
				</Meta>
				<Meta label="Project">
					{issue.project ?? "—"}
					{issue.parent && (
						<span className="block truncate text-xs text-muted-foreground">
							in {issue.parent.key} · {issue.parent.summary}
						</span>
					)}
				</Meta>
				<Meta label="Updated">
					<time dateTime={issue.updated} title={issue.updated}>
						{formatRelative(issue.updated)}
					</time>
				</Meta>
			</MetaGrid>

			<DetailSection title="Description">
				{issue.descriptionHtml ? (
					<SafeHtmlFrame
						title={`${issue.key} description`}
						html={issue.descriptionHtml}
						baseUrl={issue.siteUrl}
						allowRemoteImages
					/>
				) : (
					<p className="text-sm text-muted-foreground italic">
						No description.
					</p>
				)}
			</DetailSection>

			<DetailSection
				title={
					issue.commentCount > issue.comments.length
						? `Comments (latest ${issue.comments.length} of ${issue.commentCount})`
						: `Comments (${issue.comments.length})`
				}
			>
				{issue.comments.length === 0 ? (
					<p className="text-sm text-muted-foreground italic">
						No comments yet.
					</p>
				) : (
					<ol className="space-y-4">
						{issue.comments.map((comment) => (
							<li key={comment.id} className="rounded-lg border p-3">
								<div className="mb-2 flex items-center justify-between gap-2 text-sm">
									<PersonChip person={comment.author} fallback="Unknown" />
									<time
										dateTime={comment.created}
										className="shrink-0 text-xs text-muted-foreground"
									>
										{formatRelative(comment.created)}
									</time>
								</div>
								<SafeHtmlFrame
									title={`Comment by ${comment.author?.name ?? "unknown"}`}
									html={comment.bodyHtml}
									baseUrl={issue.siteUrl}
									allowRemoteImages
								/>
							</li>
						))}
					</ol>
				)}
			</DetailSection>
		</div>
	);
}

function DueDate({ date }: { date: string | undefined }) {
	if (!date) return <span className="text-muted-foreground">—</span>;
	const today = localDayKey(Date.now());
	const overdue = date < today;
	return (
		<span className={cn(overdue && "font-medium text-destructive")}>
			{new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
				day: "numeric",
				month: "short",
				year: "numeric",
			})}
			{overdue ? " · overdue" : date === today ? " · today" : ""}
		</span>
	);
}
