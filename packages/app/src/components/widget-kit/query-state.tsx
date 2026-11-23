import { Skeleton } from "@dashboard/ui/components/skeleton";
import type { UseQueryResult } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { IntegrationErrorNotice } from "./integration-error-notice";

interface QueryStateProps<T> {
	query: UseQueryResult<T>;
	children: (data: T) => ReactNode;
	isEmpty?: (data: T) => boolean;
	emptyMessage?: string;
}

/** Uniform loading / error / empty handling for any data-backed widget. */
export function QueryState<T>({
	query,
	children,
	isEmpty,
	emptyMessage = "Nothing here. Nice!",
}: QueryStateProps<T>) {
	if (query.isPending) return <ListSkeleton />;

	if (query.isError) {
		return (
			<IntegrationErrorNotice
				error={query.error}
				onRetry={() => query.refetch()}
			/>
		);
	}

	if (isEmpty?.(query.data)) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
				<Inbox className="size-5" />
				{emptyMessage}
			</div>
		);
	}

	return children(query.data);
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="space-y-3 p-1" aria-busy>
			{Array.from({ length: rows }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
				<div key={i} className="flex items-center gap-3">
					<Skeleton className="size-7 rounded-full" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3.5 w-4/5" />
						<Skeleton className="h-3 w-2/5" />
					</div>
				</div>
			))}
		</div>
	);
}
