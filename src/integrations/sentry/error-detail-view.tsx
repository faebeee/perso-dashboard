import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	DetailSection,
	Meta,
	MetaGrid,
} from "#/components/item-detail/detail-kit";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { QueryState } from "#/components/widget-kit/query-state";
import { formatRelative } from "#/lib/time";
import { cn } from "#/lib/utils";
import type { SentryErrorDetail, StackFrame } from "./detail";
import { compactCount } from "./mapper";
import { sentryQueries } from "./queries";

/** Detail modal body for a Sentry issue (`detailRef` = "org:issueId"). */
export function SentryErrorDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(sentryQueries.error(detailRef));
	return (
		<QueryState query={query}>
			{(error) => <ErrorDetail error={error} />}
		</QueryState>
	);
}

function ErrorDetail({ error }: { error: SentryErrorDetail }) {
	const exception = error.latest?.exceptions[0];
	const severe = error.level === "fatal" || error.level === "error";
	return (
		<div>
			<div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
				<Badge
					variant={severe ? "destructive" : "secondary"}
					className={cn("capitalize", severe && "text-white")}
				>
					{error.level}
				</Badge>
				{error.substatus && (
					<Badge variant="outline" className="capitalize">
						{error.substatus}
					</Badge>
				)}
				{exception?.handled === false && (
					<Badge variant="outline">Unhandled</Badge>
				)}
				{error.culprit && (
					<span className="truncate font-mono text-xs text-muted-foreground">
						{error.culprit}
					</span>
				)}
			</div>

			<MetaGrid>
				<Meta label="Events">
					<span className="tabular-nums">{compactCount(error.events)}</span>
				</Meta>
				<Meta label="Users">
					<span className="tabular-nums">{compactCount(error.users)}</span>
				</Meta>
				<Meta label="First seen">{formatRelative(error.firstSeen)}</Meta>
				<Meta label="Last seen">{formatRelative(error.lastSeen)}</Meta>
				<Meta label="Project">{error.project}</Meta>
				<Meta label="Assignee">
					{error.assignee ?? (
						<span className="text-muted-foreground italic">Unassigned</span>
					)}
				</Meta>
			</MetaGrid>

			{!error.latest ? (
				<DetailSection title="Latest event">
					<p className="text-sm text-muted-foreground italic">
						No event retained for this issue. Open it in Sentry for its history.
					</p>
				</DetailSection>
			) : (
				<>
					<DetailSection
						title={`Latest event${error.latest.at ? ` · ${formatRelative(error.latest.at)}` : ""}${error.latest.user ? ` · ${error.latest.user}` : ""}`}
					>
						{error.latest.exceptions.length === 0 ? (
							<p className="font-mono text-sm">
								{error.latest.message ?? error.title}
							</p>
						) : (
							<div className="space-y-4">
								{error.latest.exceptions.map((ex, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: chained exceptions are ordered
									<div key={i}>
										<p className="font-mono text-sm break-words">
											<span className="font-semibold">{ex.type}</span>
											{ex.value && (
												<span className="text-muted-foreground">
													: {ex.value}
												</span>
											)}
										</p>
										{ex.frames.length > 0 && <StackTrace frames={ex.frames} />}
									</div>
								))}
							</div>
						)}
					</DetailSection>

					{error.latest.tags.length > 0 && (
						<DetailSection title="Tags">
							<ul className="flex flex-wrap gap-1.5">
								{error.latest.tags.map((tag) => (
									<li
										key={tag.key}
										className="max-w-full truncate rounded-md border px-2 py-0.5 font-mono text-xs"
										title={`${tag.key}: ${tag.value}`}
									>
										<span className="text-muted-foreground">{tag.key}:</span>{" "}
										{tag.value}
									</li>
								))}
							</ul>
						</DetailSection>
					)}
				</>
			)}
		</div>
	);
}

/** Your code's frames by default; library frames on request. */
function StackTrace({ frames }: { frames: StackFrame[] }) {
	// Frames can repeat (recursion): position in the trace is their identity.
	const keyed = frames.map((frame, position) => ({ ...frame, key: position }));
	const inApp = keyed.filter((f) => f.inApp);
	const [showAll, setShowAll] = useState(inApp.length === 0);
	const shown = showAll ? keyed : inApp;
	return (
		<div className="mt-2 overflow-hidden rounded-md border">
			<ol className="divide-y font-mono text-xs">
				{shown.map((frame) => (
					<li
						key={frame.key}
						className={cn(
							"px-3 py-1.5",
							!frame.inApp && "text-muted-foreground",
						)}
					>
						<div className="flex flex-wrap gap-x-2">
							<span className="font-semibold">{frame.function}</span>
							<span className="truncate">
								{frame.file}
								{frame.line !== undefined && `:${frame.line}`}
								{frame.column !== undefined && `:${frame.column}`}
							</span>
						</div>
						{frame.context.length > 0 && (
							<pre className="mt-1 overflow-x-auto rounded bg-muted/60 py-1">
								{frame.context.map((c) => (
									<div
										key={c.line}
										className={cn(
											"flex px-2",
											c.current && "bg-destructive/15 font-semibold",
										)}
									>
										<span className="mr-3 w-8 shrink-0 text-right text-muted-foreground select-none">
											{c.line}
										</span>
										<span className="whitespace-pre">{c.code}</span>
									</div>
								))}
							</pre>
						)}
					</li>
				))}
			</ol>
			{!showAll && frames.length > inApp.length && (
				<div className="border-t px-2 py-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7"
						onClick={() => setShowAll(true)}
					>
						Show all {frames.length} frames (incl. libraries)
					</Button>
				</div>
			)}
		</div>
	);
}
