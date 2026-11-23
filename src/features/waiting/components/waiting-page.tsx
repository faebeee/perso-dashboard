import { useQuery } from "@tanstack/react-query";
import {
	CalendarClock,
	GitPullRequest,
	MailQuestion,
	SquareKanban,
	UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	InjectedItemActions,
	RowActions,
} from "#/components/item-actions/item-actions";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon, type ItemKind } from "#/components/source-kit/item-icon";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { QueryState } from "#/components/widget-kit/query-state";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import { WorkItemList } from "#/components/work-item/work-item-list";
import type { WaitingItem, WaitingReason } from "#/core/waiting";
import type { MeetingPrep } from "../fetchers";
import { waitingQueries } from "../queries";

const KIND_FOR_REASON: Record<WaitingReason, ItemKind> = {
	awaiting_review: "pull_request",
	unassigned: "issue",
	invitation_replies: "event",
	no_reply: "email",
};

const SECTIONS: {
	reason: WaitingReason;
	title: string;
	icon: ComponentType<{ className?: string }>;
	empty: string;
}[] = [
	{
		reason: "awaiting_review",
		title: "Your PRs without a review",
		icon: GitPullRequest,
		empty: "Every ready PR of yours has a review.",
	},
	{
		reason: "no_reply",
		title: "Emails without a reply",
		icon: MailQuestion,
		empty: "Nobody owes you an answer.",
	},
	{
		reason: "unassigned",
		title: "Issues nobody picked up",
		icon: SquareKanban,
		empty: "Everything you reported has an assignee.",
	},
	{
		reason: "invitation_replies",
		title: "Meetings with pending replies",
		icon: UsersRound,
		empty: "Everyone answered your invitations.",
	},
];

/** What you're waiting on others for, plus prep for your next meetings. */
export function WaitingPage() {
	const waiting = useQuery(waitingQueries.all());
	const byReason = (reason: WaitingReason) =>
		waiting.data?.items.filter((i) => i.reason === reason) ?? [];

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{SECTIONS.map(({ reason, title, icon: Icon }) => (
					<div
						key={reason}
						className="min-w-0 rounded-xl border bg-card p-4 shadow-xs"
					>
						<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Icon className="size-3.5" />
							<span className="truncate">{title}</span>
						</p>
						<div className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums">
							{waiting.isPending ? (
								<Skeleton className="h-8 w-10" />
							) : (
								byReason(reason).length
							)}
						</div>
						{byReason(reason)[0] && (
							<p className="mt-1 truncate text-xs text-muted-foreground">
								Oldest: {byReason(reason)[0]?.label}
							</p>
						)}
					</div>
				))}
			</div>

			<QueryState query={waiting}>
				{({ errors }) => (
					<div className="space-y-4">
						<SourceErrors errors={errors} />
						<div className="grid items-start gap-4 xl:grid-cols-2">
							{SECTIONS.map((section) => (
								<Section
									key={section.reason}
									{...section}
									items={byReason(section.reason)}
								/>
							))}
						</div>
					</div>
				)}
			</QueryState>

			<MeetingPrepSection />
		</div>
	);
}

function Section({
	title,
	icon: Icon,
	empty,
	items,
}: {
	title: string;
	icon: ComponentType<{ className?: string }>;
	empty: string;
	items: WaitingItem[];
}) {
	return (
		<section aria-label={title} className="rounded-xl border bg-card shadow-xs">
			<header className="flex items-center gap-2 border-b px-4 py-2.5">
				<Icon className="size-4 text-muted-foreground" />
				<h2 className="flex-1 text-sm font-semibold">{title}</h2>
				<Badge variant="secondary" className="tabular-nums">
					{items.length}
				</Badge>
			</header>
			<div className="max-h-[28rem] overflow-y-auto px-3 py-1">
				{items.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						{empty}
					</p>
				) : (
					<ul className="divide-y divide-border">
						{items.map((item) => (
							<li key={item.id}>
								<WaitingRow item={item} />
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}

function WaitingRow({ item }: { item: WaitingItem }) {
	const onClick = useItemClick(item);
	const kind = KIND_FOR_REASON[item.reason];
	return (
		<div className="group flex items-start gap-3 rounded-md px-1 py-2.5 hover:bg-accent/60">
			<ItemIcon source={item.source} kind={kind} className="mt-0.5" />
			<div className="min-w-0 flex-1">
				<a
					href={item.url}
					target="_blank"
					rel="noreferrer"
					onClick={onClick}
					className="block truncate text-sm font-medium text-foreground no-underline underline-offset-2 hover:underline"
				>
					{item.title}
				</a>
				<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					<Badge variant="secondary" className="shrink-0">
						{item.label}
					</Badge>
					{item.context && <span className="truncate">{item.context}</span>}
				</div>
			</div>
			<RowActions>
				<InjectedItemActions item={{ ...item, kind }} />
			</RowActions>
		</div>
	);
}

const time = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	hour: "2-digit",
	minute: "2-digit",
});

function MeetingPrepSection() {
	const prep = useQuery(waitingQueries.meetingPrep());
	return (
		<section
			aria-label="Meeting prep"
			className="rounded-xl border bg-card shadow-xs"
		>
			<header className="flex items-center gap-2 border-b px-4 py-2.5">
				<CalendarClock className="size-4 text-muted-foreground" />
				<h2 className="flex-1 text-sm font-semibold">Meeting prep</h2>
				<span className="text-xs text-muted-foreground">
					Next 24 hours · recent conversations with the attendees
				</span>
			</header>
			<div className="px-3 py-2">
				<QueryState
					query={prep}
					isEmpty={({ items }) => items.length === 0}
					emptyMessage="No meetings with other people in the next 24 hours."
				>
					{({ items, errors }) => (
						<div className="space-y-4">
							<SourceErrors errors={errors} />
							{items.map((entry) => (
								<MeetingCard key={entry.meeting.id} prep={entry} />
							))}
						</div>
					)}
				</QueryState>
			</div>
		</section>
	);
}

function MeetingCard({ prep: { meeting, related } }: { prep: MeetingPrep }) {
	const onClick = useItemClick(meeting);
	const people = meeting.attendees ?? [];
	return (
		<article className="rounded-lg border p-3">
			<div className="flex flex-wrap items-center gap-2">
				<ItemIcon source={meeting.source} kind="event" />
				<a
					href={meeting.url}
					target="_blank"
					rel="noreferrer"
					onClick={onClick}
					className="min-w-0 flex-1 truncate text-sm font-medium text-foreground no-underline underline-offset-2 hover:underline"
				>
					{meeting.title}
				</a>
				<span className="text-xs text-muted-foreground tabular-nums">
					{time.format(new Date(meeting.start))}
				</span>
			</div>
			<p
				className="mt-1 truncate text-xs text-muted-foreground"
				title={people.map((p) => p.email).join(", ")}
			>
				With{" "}
				{people
					.map((p) => p.name ?? p.email)
					.slice(0, 5)
					.join(", ")}
				{people.length > 5 ? ` +${people.length - 5}` : ""}
			</p>
			<div className="mt-2">
				{related.length === 0 ? (
					<p className="text-xs text-muted-foreground italic">
						No recent conversations with these people.
					</p>
				) : (
					<WorkItemList items={related.slice(0, 5)} />
				)}
			</div>
		</article>
	);
}
