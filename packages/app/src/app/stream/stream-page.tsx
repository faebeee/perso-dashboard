import { expireCachedData } from "@dashboard/platform/services";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QueryState } from "#/components/widget-kit/query-state";
import { SourceErrors } from "#/components/widget-kit/source-errors";
import { useNow } from "#/components/widget-kit/sync-status";
import { StreamList } from "#/features/stream/components/stream-list";
import {
	streamQueries,
	useDismissStreamEvents,
	useRestoreStreamEvents,
} from "#/features/stream/queries";
import { arrivals, visibleStream } from "#/features/stream/stream";
import { queryKeys } from "#/lib/query-keys";
import { formatRelative } from "#/lib/time";
import { fetchStream } from "./fetchers";

/** How often the stream asks for news. API responses are cached for ~2 min. */
const POLL_MS = 60_000;
/** How long "Undo" stays after clearing. */
const UNDO_MS = 10_000;

const streamQuery = (live: boolean) =>
	queryOptions({
		queryKey: queryKeys.stream,
		queryFn: () => fetchStream(),
		staleTime: 30_000,
		refetchInterval: live ? POLL_MS : false,
	});

/** The Live page: what changed across your tools, newest on top. */
export function StreamPage() {
	const [live, setLive] = useState(true);
	const query = useQuery(streamQuery(live));
	const dismissals = useQuery(streamQueries.dismissals());
	const dismiss = useDismissStreamEvents();
	const restore = useRestoreStreamEvents();
	const queryClient = useQueryClient();
	const now = useNow(30_000);

	// Entries that arrive while the page is open get highlighted.
	const known = useRef<Set<string> | null>(null);
	const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
	useEffect(() => {
		if (!query.data) return;
		const ids = query.data.events.map((e) => e.id);
		const added = arrivals(query.data.events, known.current);
		known.current = new Set([...(known.current ?? []), ...ids]);
		if (added.length > 0) setFresh((prev) => new Set([...prev, ...added]));
	}, [query.data]);

	const cleared = useMemo(() => new Set(dismissals.data), [dismissals.data]);
	const events = useMemo(
		() => (query.data ? visibleStream(query.data.events, cleared, now) : []),
		[query.data, cleared, now],
	);

	const [undo, setUndo] = useState<string[] | null>(null);
	useEffect(() => {
		if (!undo) return;
		const timer = setTimeout(() => setUndo(null), UNDO_MS);
		return () => clearTimeout(timer);
	}, [undo]);

	const clear = (ids: string[]) => {
		if (ids.length === 0) return;
		dismiss.mutate(ids);
		setUndo(ids);
	};

	const refresh = async () => {
		await expireCachedData();
		await queryClient.invalidateQueries({ queryKey: queryKeys.stream });
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<LiveBadge
					live={live}
					fetching={query.isFetching}
					updatedAt={query.dataUpdatedAt}
					now={now}
				/>
				<div className="ml-auto flex items-center gap-1.5">
					<Button
						size="sm"
						variant="ghost"
						onClick={() => setLive(!live)}
						aria-pressed={!live}
					>
						{live ? <Pause /> : <Play />}
						{live ? "Pause" : "Resume"}
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={refresh}
						disabled={query.isFetching}
					>
						<RefreshCw className={cn(query.isFetching && "animate-spin")} />
						Refresh
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={events.length === 0}
						onClick={() => clear(events.map((e) => e.id))}
					>
						<Trash2 />
						Clear all
					</Button>
				</div>
			</div>

			{undo && (
				<output className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
					<span className="flex-1">
						{undo.length === 1
							? "Entry cleared."
							: `${undo.length} entries cleared.`}
					</span>
					<Button
						size="sm"
						variant="ghost"
						className="h-7"
						onClick={() => {
							restore.mutate(undo);
							setUndo(null);
						}}
					>
						<Undo2 /> Undo
					</Button>
				</output>
			)}

			<QueryState query={query}>
				{(data) => (
					<div className="space-y-3">
						<SourceErrors errors={data.errors} />
						{dismissals.isPending ? null : events.length === 0 ? (
							<p className="py-12 text-center text-sm text-muted-foreground">
								All caught up. New mail, ticket updates and commits show up here
								as they happen.
							</p>
						) : (
							<StreamList
								events={events}
								fresh={fresh}
								now={now}
								onClear={(event) => clear([event.id])}
							/>
						)}
					</div>
				)}
			</QueryState>
		</div>
	);
}

function LiveBadge({
	live,
	fetching,
	updatedAt,
	now,
}: {
	live: boolean;
	fetching: boolean;
	updatedAt: number;
	now: number;
}) {
	return (
		<span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
			<span className="relative flex size-2.5" aria-hidden>
				{live && (
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
				)}
				<span
					className={cn(
						"relative inline-flex size-2.5 rounded-full",
						live ? "bg-red-500" : "bg-muted-foreground/50",
					)}
				/>
			</span>
			<span className="font-medium text-foreground">
				{live ? "Live" : "Paused"}
			</span>
			{fetching ? (
				<span>Checking…</span>
			) : (
				updatedAt > 0 && (
					<span>
						Updated {formatRelative(new Date(updatedAt).toISOString(), now)}
					</span>
				)
			)}
		</span>
	);
}
