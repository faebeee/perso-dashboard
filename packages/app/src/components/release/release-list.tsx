import { type Release, releaseDateMs } from "@dashboard/core/release";
import { Badge } from "@dashboard/ui/components/badge";
import { cn } from "@dashboard/ui/lib/utils";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { formatRelative } from "#/lib/time";

interface ReleaseListProps {
	releases: Release[];
}

/** Releases split into "Upcoming" and "Recently released". */
export function ReleaseList({ releases }: ReleaseListProps) {
	const upcoming = releases.filter((r) => r.state === "upcoming");
	const released = releases.filter((r) => r.state === "released");

	return (
		<div className="space-y-3 py-1">
			{upcoming.length > 0 && (
				<ReleaseSection title="Upcoming" releases={upcoming} />
			)}
			{released.length > 0 && (
				<ReleaseSection title="Recently released" releases={released} />
			)}
		</div>
	);
}

function ReleaseSection({
	title,
	releases,
}: {
	title: string;
	releases: Release[];
}) {
	return (
		<section aria-label={title}>
			<h3 className="sticky top-0 z-10 bg-card px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				{title}
			</h3>
			<ul className="divide-y divide-border">
				{releases.map((release) => (
					<li key={release.id}>
						<ReleaseRow release={release} />
					</li>
				))}
			</ul>
		</section>
	);
}

function ReleaseRow({ release }: { release: Release }) {
	return (
		<a
			href={release.url}
			target="_blank"
			rel="noreferrer"
			className="group flex items-start gap-3 rounded-md px-1 py-2.5 text-inherit no-underline hover:bg-accent/60"
		>
			<ItemIcon source={release.source} kind="release" className="mt-0.5" />
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
