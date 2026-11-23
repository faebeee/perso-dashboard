import type { WorkItem } from "@dashboard/core/work-item";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { cn } from "@dashboard/ui/lib/utils";
import { UserRound } from "lucide-react";
import {
	InjectedItemActions,
	RowActions,
} from "#/components/item-actions/item-actions";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { formatRelative } from "#/lib/time";

interface WorkItemListProps {
	items: WorkItem[];
	className?: string;
}

/** Each row leads with an icon for its kind (PR, issue, email…) tinted by source. */
export function WorkItemList({ items, className }: WorkItemListProps) {
	return (
		<ul className={cn("divide-y divide-border", className)}>
			{items.map((item) => (
				<li key={item.id}>
					<WorkItemRow item={item} />
				</li>
			))}
		</ul>
	);
}

function WorkItemRow({ item }: { item: WorkItem }) {
	const onClick = useItemClick(item);
	return (
		<div className="group flex items-start gap-1 rounded-md transition-colors hover:bg-accent/60">
			<a
				href={item.url}
				target="_blank"
				rel="noreferrer"
				onClick={onClick}
				className="flex min-w-0 flex-1 items-start gap-3 px-1 py-2.5 text-inherit no-underline"
			>
				<ItemIcon source={item.source} kind={item.kind} className="mt-0.5" />

				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-foreground underline-offset-2 group-hover:underline">
						{item.title}
					</p>
					<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
						{item.actor && (
							<>
								<Actor person={item.actor} />
								<span aria-hidden>·</span>
							</>
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
			<RowActions className="self-center pr-1">
				<InjectedItemActions item={item} />
			</RowActions>
		</div>
	);
}

function Actor({ person }: { person: NonNullable<WorkItem["actor"]> }) {
	return (
		<span className="inline-flex max-w-40 min-w-0 shrink items-center gap-1">
			<Avatar className="size-4">
				{person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
				<AvatarFallback className="text-[8px]">
					{initials(person.name)}
				</AvatarFallback>
			</Avatar>
			<span className="truncate">{person.name}</span>
		</span>
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
