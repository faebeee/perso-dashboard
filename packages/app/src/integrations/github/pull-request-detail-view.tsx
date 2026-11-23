import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
	CircleCheck,
	CircleDashed,
	CircleMinus,
	CircleX,
	GitBranch,
	MessageSquare,
} from "lucide-react";
import { useState } from "react";
import {
	DetailSection,
	Meta,
	MetaGrid,
	PersonChip,
} from "#/components/item-detail/detail-kit";
import { SafeHtmlFrame } from "#/components/item-detail/safe-html-frame";
import { QueryState } from "#/components/widget-kit/query-state";
import { formatRelative } from "#/lib/time";
import type { CheckState, PullRequestDetail, ReviewVerdict } from "./detail";
import { githubQueries } from "./queries";

/** Detail modal body for a pull request (`detailRef` = "owner/repo#123"). */
export function PullRequestDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(githubQueries.pullRequest(detailRef));
	return (
		<QueryState query={query}>{(pr) => <PullRequest pr={pr} />}</QueryState>
	);
}

const STATE_LABEL: Record<PullRequestDetail["state"], string> = {
	open: "Open",
	draft: "Draft",
	merged: "Merged",
	closed: "Closed",
};

const VERDICT: Record<
	ReviewVerdict,
	{ label: string; icon: typeof CircleCheck; className: string }
> = {
	approved: {
		label: "Approved",
		icon: CircleCheck,
		className: "text-emerald-600 dark:text-emerald-400",
	},
	changes_requested: {
		label: "Changes requested",
		icon: CircleX,
		className: "text-destructive",
	},
	commented: {
		label: "Commented",
		icon: MessageSquare,
		className: "text-muted-foreground",
	},
	pending: {
		label: "Review pending",
		icon: CircleDashed,
		className: "text-amber-600 dark:text-amber-400",
	},
};

const CHECK: Record<
	CheckState,
	{ label: string; icon: typeof CircleCheck; className: string }
> = {
	success: {
		label: "passed",
		icon: CircleCheck,
		className: "text-emerald-600 dark:text-emerald-400",
	},
	failure: { label: "failed", icon: CircleX, className: "text-destructive" },
	pending: {
		label: "running",
		icon: CircleDashed,
		className: "text-amber-600 dark:text-amber-400",
	},
	neutral: {
		label: "skipped",
		icon: CircleMinus,
		className: "text-muted-foreground",
	},
};

const FILE_LIMIT = 50;

function PullRequest({ pr }: { pr: PullRequestDetail }) {
	const [allChecks, setAllChecks] = useState(false);
	const counts = (["failure", "pending", "success", "neutral"] as const).map(
		(state) => ({
			state,
			count: pr.checks.filter((c) => c.state === state).length,
		}),
	);
	// Problems first; passing checks only when asked.
	// Check names can repeat (matrix builds): position is part of identity.
	const keyed = pr.checks.map((check, position) => ({
		...check,
		key: `${position}:${check.name}`,
	}));
	const shownChecks = allChecks
		? keyed
		: keyed.filter((c) => c.state === "failure" || c.state === "pending");

	return (
		<div>
			<div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
				<span className="font-mono text-muted-foreground">
					{pr.repo} #{pr.number}
				</span>
				<Badge variant={pr.state === "open" ? "default" : "secondary"}>
					{STATE_LABEL[pr.state]}
				</Badge>
				{pr.labels.map((label) => (
					<Badge key={label} variant="outline">
						{label}
					</Badge>
				))}
			</div>

			<MetaGrid>
				<Meta label="Author">
					<PersonChip person={pr.author} />
				</Meta>
				<Meta label="Updated">
					<time dateTime={pr.updatedAt} title={pr.updatedAt}>
						{formatRelative(pr.updatedAt)}
					</time>
				</Meta>
				<Meta label="Branch">
					<span className="inline-flex max-w-full items-center gap-1 font-mono text-xs">
						<GitBranch className="size-3.5 shrink-0" />
						<span className="truncate">
							{pr.branch.head} → {pr.branch.base}
						</span>
					</span>
				</Meta>
				<Meta label="Changes">
					<span className="tabular-nums">
						{pr.changedFiles} file{pr.changedFiles === 1 ? "" : "s"} ·{" "}
						<span className="text-emerald-600 dark:text-emerald-400">
							+{pr.additions}
						</span>{" "}
						<span className="text-destructive">−{pr.deletions}</span>
					</span>
				</Meta>
			</MetaGrid>

			<DetailSection title="Reviews">
				{pr.reviewers.length === 0 ? (
					<p className="text-sm text-muted-foreground italic">
						No reviews or requests yet.
					</p>
				) : (
					<ul className="space-y-1.5">
						{pr.reviewers.map((reviewer) => {
							const verdict = VERDICT[reviewer.verdict];
							return (
								<li
									key={reviewer.name}
									className="flex items-center gap-2 text-sm"
								>
									<PersonChip person={reviewer} />
									<span
										className={cn(
											"ml-auto inline-flex items-center gap-1 text-xs",
											verdict.className,
										)}
									>
										<verdict.icon className="size-3.5" />
										{verdict.label}
										{reviewer.at && (
											<span className="text-muted-foreground">
												{" "}
												· {formatRelative(reviewer.at)}
											</span>
										)}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</DetailSection>

			<DetailSection title="Checks">
				{pr.checks.length === 0 ? (
					<p className="text-sm text-muted-foreground italic">
						No checks reported.
					</p>
				) : (
					<div className="space-y-2">
						<p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
							{counts
								.filter((c) => c.count > 0)
								.map(({ state, count }) => {
									const check = CHECK[state];
									return (
										<span
											key={state}
											className={cn(
												"inline-flex items-center gap-1",
												check.className,
											)}
										>
											<check.icon className="size-4" /> {count} {check.label}
										</span>
									);
								})}
						</p>
						{shownChecks.length > 0 && (
							<ul className="space-y-1">
								{shownChecks.map((check) => {
									const meta = CHECK[check.state];
									return (
										<li
											key={check.key}
											className="flex items-center gap-2 text-sm"
										>
											<meta.icon
												className={cn("size-4 shrink-0", meta.className)}
											/>
											{check.url ? (
												<a
													href={check.url}
													target="_blank"
													rel="noreferrer"
													className="truncate"
												>
													{check.name}
												</a>
											) : (
												<span className="truncate">{check.name}</span>
											)}
										</li>
									);
								})}
							</ul>
						)}
						{shownChecks.length < pr.checks.length && (
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2"
								onClick={() => setAllChecks(true)}
							>
								Show all {pr.checks.length} checks
							</Button>
						)}
					</div>
				)}
			</DetailSection>

			<DetailSection title="Description">
				{pr.bodyHtml ? (
					<SafeHtmlFrame
						title={`${pr.repo} #${pr.number} description`}
						html={pr.bodyHtml}
						baseUrl="https://github.com/"
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
					pr.files.length > FILE_LIMIT
						? `Files (first ${FILE_LIMIT} of ${pr.changedFiles})`
						: `Files (${pr.files.length})`
				}
			>
				<ul className="space-y-0.5 font-mono text-xs">
					{pr.files.slice(0, FILE_LIMIT).map((file) => (
						<li key={file.path} className="flex items-center gap-2">
							<span className="min-w-0 flex-1 truncate" title={file.path}>
								{file.path}
							</span>
							{file.status !== "modified" && (
								<span className="text-muted-foreground">{file.status}</span>
							)}
							<span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
								+{file.additions}
							</span>
							<span className="shrink-0 tabular-nums text-destructive">
								−{file.deletions}
							</span>
						</li>
					))}
				</ul>
			</DetailSection>
		</div>
	);
}
