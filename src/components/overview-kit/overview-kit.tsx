import type { UseQueryResult } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { QueryState } from "#/components/widget-kit/query-state";
import type { TallyRow } from "#/lib/tally";
import { cn } from "#/lib/utils";

/**
 * Building blocks for integration overview pages: a row of headline numbers
 * and data-backed sections. Each piece handles its own loading/error state.
 */

type Icon = ComponentType<{ className?: string }>;

export function StatGrid({ children }: { children: ReactNode }) {
	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
	);
}

interface StatTileProps<T> {
	label: string;
	icon?: Icon;
	query: UseQueryResult<T>;
	value: (data: T) => ReactNode;
	hint?: (data: T) => ReactNode;
}

export function StatTile<T>({
	label,
	icon: Icon,
	query,
	value,
	hint,
}: StatTileProps<T>) {
	return (
		<div className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
			<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				{Icon && <Icon className="size-3.5 shrink-0" />}
				<span className="truncate">{label}</span>
			</p>
			<div className="mt-2 truncate font-display text-2xl font-semibold tracking-tight tabular-nums">
				{query.isPending ? (
					<Skeleton className="h-8 w-14" />
				) : query.isError ? (
					<span className="text-muted-foreground" title={query.error.message}>
						—
					</span>
				) : (
					value(query.data)
				)}
			</div>
			{hint && query.isSuccess && (
				<p className="mt-1 truncate text-xs text-muted-foreground">
					{hint(query.data)}
				</p>
			)}
		</div>
	);
}

interface OverviewSectionProps<T> {
	title: string;
	icon?: Icon;
	query: UseQueryResult<T>;
	/** Shown as a badge next to the title once loaded. */
	count?: (data: T) => ReactNode;
	isEmpty?: (data: T) => boolean;
	emptyMessage?: string;
	className?: string;
	children: (data: T) => ReactNode;
}

export function OverviewSection<T>({
	title,
	icon: Icon,
	query,
	count,
	isEmpty,
	emptyMessage,
	className,
	children,
}: OverviewSectionProps<T>) {
	return (
		<section
			aria-label={title}
			className={cn(
				"flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs",
				className,
			)}
		>
			<header className="flex items-center gap-2 border-b px-4 py-2.5">
				{Icon && <Icon className="size-4 text-muted-foreground" />}
				<h2 className="flex-1 truncate text-sm font-semibold">{title}</h2>
				{count && query.isSuccess && (
					<Badge variant="secondary" className="tabular-nums">
						{count(query.data)}
					</Badge>
				)}
			</header>
			<div className="max-h-[28rem] min-h-32 overflow-y-auto px-3 py-1">
				<QueryState query={query} isEmpty={isEmpty} emptyMessage={emptyMessage}>
					{children}
				</QueryState>
			</div>
		</section>
	);
}

interface BreakdownListProps {
	rows: TallyRow[];
	/** Formats a value for display (e.g. minutes → "2h 30m"). */
	format?: (value: number) => string;
	limit?: number;
}

/** Ranked labels with proportional bars: issues per status, PRs per repo… */
export function BreakdownList({
	rows,
	format = String,
	limit = 8,
}: BreakdownListProps) {
	const max = Math.max(1, ...rows.map((row) => row.value));
	return (
		<ul className="space-y-3 px-1 py-3">
			{rows.slice(0, limit).map((row) => (
				<li key={row.label}>
					<div className="flex items-baseline justify-between gap-3 text-sm">
						<span className="truncate">{row.label}</span>
						<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
							{format(row.value)}
						</span>
					</div>
					<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className="meter-fill h-full rounded-full bg-primary/70"
							style={{ width: `${(row.value / max) * 100}%` }}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

/** "30+" when a list hit the provider's page size, so counts aren't understated. */
export function cappedCount(count: number, pageSize: number): string {
	return count >= pageSize ? `${pageSize}+` : String(count);
}
