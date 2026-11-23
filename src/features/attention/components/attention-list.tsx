import { Video } from "lucide-react";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import {
	type AttentionItem,
	URGENCY_LABELS,
	type Urgency,
	urgencySchema,
} from "#/core/attention";
import type { IntegrationError } from "#/core/result";
import { cn } from "#/lib/utils";
import { KIND_FOR_REASON } from "../kinds";

interface AttentionListProps {
	items: AttentionItem[];
	errors: IntegrationError[];
	/** Cap per urgency group (widget). */
	limit?: number;
}

const GROUP_STYLE: Record<Urgency, string> = {
	now: "text-destructive",
	today: "text-foreground",
	soon: "text-muted-foreground",
};

/** Items grouped "Right now" / "Today" / "When you can", already ranked. */
export function AttentionList({ items, errors, limit }: AttentionListProps) {
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
		</div>
	);
}

function AttentionRow({ item }: { item: AttentionItem }) {
	const onClick = useItemClick(item);
	return (
		<div className="flex items-start gap-3 rounded-md px-1 py-2.5 hover:bg-accent/60">
			<ItemIcon
				source={item.source}
				kind={KIND_FOR_REASON[item.reason]}
				className="mt-0.5"
			/>

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
			</div>

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
