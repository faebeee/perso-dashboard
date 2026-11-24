import {
	type AttentionItem,
	URGENCY_LABELS,
	type Urgency,
	urgencySchema,
} from "@dashboard/core/attention";
import {
	type DismissedItem,
	type SnoozeOption,
	snoozeUntil,
} from "@dashboard/core/dismissal";
import type { IntegrationError } from "@dashboard/core/result";
import { minutesOfDay, preferences } from "@dashboard/platform/preferences";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { cn } from "@dashboard/ui/lib/utils";
import { Check, ChevronDown, Clock, RotateCcw, Video } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import {
	InjectedItemActions,
	RowActions,
} from "#/components/item-actions/item-actions";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemInsightLine } from "#/components/item-insight/item-insight";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import { KIND_FOR_REASON } from "../kinds";
import { useDismissItem, useRestoreItem } from "../queries";

interface AttentionListProps {
	items: AttentionItem[];
	errors: IntegrationError[];
	/** Done or snoozed items, offered for restoring. */
	hidden?: DismissedItem[];
	/** Cap per urgency group (widget). */
	limit?: number;
}

const GROUP_STYLE: Record<Urgency, string> = {
	now: "text-destructive",
	today: "text-foreground",
	soon: "text-muted-foreground",
};

/** Items grouped "Right now" / "Today" / "When you can", already ranked. */
export function AttentionList({
	items,
	errors,
	hidden = [],
	limit,
}: AttentionListProps) {
	const groups = urgencySchema.options
		.map((urgency) => ({
			urgency,
			items: items.filter((i) => i.urgency === urgency),
		}))
		.filter((group) => group.items.length > 0);

	return (
		<div className="space-y-4">
			<SourceErrors errors={errors} />

			{groups.length === 0 ? (
				<p className="py-10 text-center text-sm text-muted-foreground">
					Nothing urgent. Enjoy the quiet. 🎉
				</p>
			) : (
				groups.map((group) => (
					<section
						key={group.urgency}
						aria-label={URGENCY_LABELS[group.urgency]}
					>
						<h3
							className={cn(
								"sticky top-0 z-10 flex items-center gap-2 bg-card px-1 py-1 text-xs font-semibold tracking-wide uppercase",
								GROUP_STYLE[group.urgency],
							)}
						>
							{URGENCY_LABELS[group.urgency]}
							<span className="font-normal text-muted-foreground">
								{group.items.length}
							</span>
						</h3>
						<ul className="divide-y divide-border">
							{group.items.slice(0, limit).map((item) => (
								<li key={item.id}>
									<AttentionRow item={item} />
								</li>
							))}
						</ul>
					</section>
				))
			)}

			{hidden.length > 0 && <HiddenItems hidden={hidden} />}
		</div>
	);
}

function AttentionRow({ item }: { item: AttentionItem }) {
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
					<Badge
						variant={item.urgency === "now" ? "destructive" : "secondary"}
						className={cn("shrink-0", item.urgency === "now" && "text-white")}
					>
						{item.label}
					</Badge>
					{(item.context || item.actor) && (
						<span className="truncate">
							{[item.actor?.name, item.context].filter(Boolean).join(" · ")}
						</span>
					)}
				</div>
				<ItemInsightLine id={item.id} />
			</div>

			<RowActions>
				<InjectedItemActions item={{ ...item, kind }} />
				<DismissActions item={item} />
			</RowActions>

			{item.action && (
				<Button
					asChild
					size="sm"
					variant={item.urgency === "now" ? "default" : "outline"}
					className="h-7 shrink-0"
				>
					<a href={item.action.url} target="_blank" rel="noreferrer">
						<Video /> {item.action.label}
					</a>
				</Button>
			)}
		</div>
	);
}

const SNOOZE_OPTIONS: { option: SnoozeOption; label: string }[] = [
	{ option: "1h", label: "1 hour" },
	{ option: "3h", label: "3 hours" },
	{ option: "tomorrow", label: "Tomorrow morning" },
	{ option: "next_week", label: "Next week" },
];

function DismissActions({ item }: { item: AttentionItem }) {
	const dismiss = useDismissItem();
	const { workdayStart } = useSyncExternalStore(
		preferences.subscribe,
		preferences.get,
	);
	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="size-7"
				title="Done: hide until it changes"
				aria-label={`Mark "${item.title}" done`}
				disabled={dismiss.isPending}
				onClick={() => dismiss.mutate({ item, until: null })}
			>
				<Check />
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						title="Snooze"
						aria-label={`Snooze "${item.title}"`}
					>
						<Clock />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Snooze until…</DropdownMenuLabel>
					{SNOOZE_OPTIONS.map(({ option, label }) => (
						<DropdownMenuItem
							key={option}
							onSelect={() =>
								dismiss.mutate({
									item,
									until: snoozeUntil(
										option,
										new Date(),
										minutesOfDay(workdayStart),
									),
								})
							}
						>
							{label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}

const untilFormat = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	hour: "2-digit",
	minute: "2-digit",
});

function HiddenItems({ hidden }: { hidden: DismissedItem[] }) {
	const [open, setOpen] = useState(false);
	const restore = useRestoreItem();
	return (
		<section aria-label="Done and snoozed">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				aria-expanded={open}
				className="flex items-center gap-1 px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
			>
				<ChevronDown
					className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
				/>
				Done & snoozed ({hidden.length})
			</button>
			{open && (
				<ul className="mt-1 divide-y divide-border">
					{hidden.map(({ item, dismissal }) => (
						<li
							key={item.id}
							className="flex items-center gap-3 px-1 py-2 text-sm"
						>
							<ItemIcon
								source={item.source}
								kind={KIND_FOR_REASON[item.reason]}
							/>
							<span className="min-w-0 flex-1 truncate text-muted-foreground">
								{item.title}
							</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{dismissal.mode === "snoozed" && dismissal.until
									? `Until ${untilFormat.format(dismissal.until)}`
									: "Done"}
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="h-7"
								disabled={restore.isPending}
								onClick={() => restore.mutate(item.id)}
							>
								<RotateCcw /> Restore
							</Button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
