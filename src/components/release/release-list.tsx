import { Badge } from "#/components/ui/badge";
import type { WorkItemSource } from "#/components/work-item/work-item-list";
import { type Release, releaseDateMs } from "#/core/release";
import { formatRelative } from "#/lib/time";
import { cn } from "#/lib/utils";

interface ReleaseListProps {
	releases: Release[];
	sources: Record<string, WorkItemSource>;
}

/** Releases split into "Upcoming" and "Recently released". */
export function ReleaseList({ releases, sources }: ReleaseListProps) {
	const upcoming = releases.filter((r) => r.state === "upcoming");
	const released = releases.filter((r) => r.state === "released");

	return (
		<div className="space-y-3 py-1">
			{upcoming.length > 0 && (
				<ReleaseSection
					title="Upcoming"
					releases={upcoming}
					sources={sources}
				/>
			)}
			{released.length > 0 && (
				<ReleaseSection
					title="Recently released"
					releases={released}
					sources={sources}
				/>
			)}
		</div>
	);
}

function ReleaseSection({
	title,
	releases,
	sources,
}: {
	title: string;
	releases: Release[];
	sources: Record<string, WorkItemSource>;
}) {
	return (
		<section aria-label={title}>
			<h3 className="sticky top-0 z-10 bg-card px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				{title}
			</h3>
			<ul className="divide-y divide-border">
				{releases.map((release) => (
					<li key={release.id}>
						<ReleaseRow release={release} source={sources[release.source]} />
					</li>
				))}
			</ul>
		</section>
	);
}

function ReleaseRow({
	release,
	source,
}: {
	release: Release;
	source?: WorkItemSource;
}) {
	const Icon = source?.icon;
	return (
		<a
			href={release.url}
			target="_blank"
			rel="noreferrer"
			className="group flex items-start gap-3 rounded-md px-1 py-2.5 text-inherit no-underline hover:bg-accent/60"
		>
			{Icon && (
				<Icon
					className="mt-0.5 size-4 shrink-0 text-muted-foreground"
					aria-label={source?.name}
				/>
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground group-hover:underline underline-offset-2">
					{release.name}
				</p>
				<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					<span className="truncate">{release.project}</span>
					<span aria-hidden>·</span>
					<span className="shrink-0">
						{release.date
							? formatRelative(
									new Date(releaseDateMs(release.date)).toISOString(),
								)
							: "No date"}
					</span>
				</div>
			</div>
			{release.tags.length > 0 && (
				<div className="flex shrink-0 gap-1">
					{release.tags.map((tag) => (
						<Badge
							key={tag}
							variant={tag === "Overdue" ? "destructive" : "outline"}
							className={cn(tag === "Overdue" && "text-white")}
						>
							{tag}
						</Badge>
					))}
				</div>
			)}
		</a>
	);
}
