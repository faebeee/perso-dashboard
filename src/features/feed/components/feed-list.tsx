import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import {
	WorkItemList,
	type WorkItemSource,
} from "#/components/work-item/work-item-list";
import type { IntegrationError } from "#/core/result";
import type { WorkItem } from "#/core/work-item";
import { cn } from "#/lib/utils";

interface FeedListProps {
	items: WorkItem[];
	errors: IntegrationError[];
	sources: Record<string, WorkItemSource>;
	/** Show per-source filter chips. */
	filterable?: boolean;
	limit?: number;
}

export function FeedList({
	items,
	errors,
	sources,
	filterable = false,
	limit,
}: FeedListProps) {
	const [active, setActive] = useState<string | null>(null);

	const counts = useMemo(() => {
		const map = new Map<string, number>();
		for (const item of items)
			map.set(item.source, (map.get(item.source) ?? 0) + 1);
		return map;
	}, [items]);

	const visible = (
		active ? items.filter((i) => i.source === active) : items
	).slice(0, limit);

	return (
		<div className="space-y-3">
			<SourceErrors
				errors={errors}
				nameOf={(id) => (id ? sources[id]?.name : undefined)}
			/>

			{filterable && counts.size > 1 && (
				<div
					className="flex flex-wrap gap-2"
					role="toolbar"
					aria-label="Filter by source"
				>
					<FilterChip pressed={active === null} onClick={() => setActive(null)}>
						All <span className="text-muted-foreground">{items.length}</span>
					</FilterChip>
					{[...counts].map(([id, count]) => {
						const source = sources[id];
						const Icon = source?.icon;
						return (
							<FilterChip
								key={id}
								pressed={active === id}
								onClick={() => setActive(active === id ? null : id)}
							>
								{Icon && <Icon />}
								{source?.name ?? id}{" "}
								<span className="text-muted-foreground">{count}</span>
							</FilterChip>
						);
					})}
				</div>
			)}

			{visible.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					Nothing in your feed. Connect an integration or enjoy the quiet.
				</p>
			) : (
				<WorkItemList items={visible} sources={sources} />
			)}
		</div>
	);
}

function FilterChip({
	pressed,
	className,
	...props
}: React.ComponentProps<typeof Button> & { pressed: boolean }) {
	return (
		<Button
			size="sm"
			variant={pressed ? "secondary" : "outline"}
			aria-pressed={pressed}
			className={cn("h-7 rounded-full", className)}
			{...props}
		/>
	);
}
