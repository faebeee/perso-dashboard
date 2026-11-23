import { UserRound } from "lucide-react";
import type { ComponentType } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import type { WorkItem } from "#/core/work-item";
import { formatRelative } from "#/lib/time";
import { cn } from "#/lib/utils";

export interface WorkItemSource {
	name: string;
	icon: ComponentType<{ className?: string }>;
}

interface WorkItemListProps {
	items: WorkItem[];
	/** When provided, each row shows which integration it came from. */
	sources?: Record<string, WorkItemSource>;
	className?: string;
}

export function WorkItemList({ items, sources, className }: WorkItemListProps) {
	return (
		<ul className={cn("divide-y divide-border", className)}>
			{items.map((item) => (
				<li key={item.id}>
					<WorkItemRow item={item} source={sources?.[item.source]} />
				</li>
			))}
		</ul>
	);
}

function WorkItemRow({
	item,
	source,
}: {
	item: WorkItem;
	source?: WorkItemSource;
}) {
	const SourceIcon = source?.icon;
	return (
		<a
			href={item.url}
			target="_blank"
			rel="noreferrer"
			className="group flex items-start gap-3 px-1 py-2.5 text-inherit no-underline hover:bg-accent/60 rounded-md transition-colors"
		>
			<Avatar className="mt-0.5 size-7">
				{item.actor?.avatarUrl && (
					<AvatarImage src={item.actor.avatarUrl} alt="" />
				)}
				<AvatarFallback className="text-[10px]">
					{initials(item.actor?.name ?? item.source)}
				</AvatarFallback>
			</Avatar>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground group-hover:underline underline-offset-2">
					{item.title}
				</p>
				<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					{SourceIcon && (
						<SourceIcon
							className="size-3.5 shrink-0"
							aria-label={source?.name}
						/>
					)}
					{item.context && <span className="truncate">{item.context}</span>}
					{item.assignee !== undefined && (
						<>
							<span aria-hidden>·</span>
							<Assignee person={item.assignee} />
						</>
					)}
					<span aria-hidden>·</span>
					<time dateTime={item.updatedAt} className="shrink-0">
						{formatRelative(item.updatedAt)}
					</time>
				</div>
			</div>

			{(item.status || item.tags?.length) && (
				<div className="hidden shrink-0 gap-1 sm:flex">
					{item.status && <Badge variant="secondary">{item.status}</Badge>}
					{item.tags?.slice(0, 2).map((tag) => (
						<Badge key={tag} variant="outline">
							{tag}
						</Badge>
					))}
				</div>
			)}
		</a>
	);
}

function Assignee({ person }: { person: WorkItem["assignee"] }) {
	if (!person) {
		return <span className="shrink-0 italic">Unassigned</span>;
	}
	return (
		<span
			className="inline-flex min-w-0 shrink items-center gap-1"
			title={`Assigned to ${person.name}`}
		>
			<UserRound className="size-3.5 shrink-0" aria-label="Assigned to" />
			<span className="truncate">{person.name}</span>
		</span>
	);
}

function initials(name: string) {
	return name
		.split(/[\s._-]+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}
