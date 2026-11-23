import { z } from "zod";

/** Normalized release: a GitHub release, a Jira fix version, … */
export const releaseSchema = z.object({
	/** Globally unique: `${source}:${nativeId}` */
	id: z.string(),
	source: z.string(),
	name: z.string(),
	url: z.string(),
	/** Repository or project the release belongs to. */
	project: z.string(),
	state: z.enum(["upcoming", "released"]),
	/** Release date: ISO date-time or `YYYY-MM-DD`. Optional for upcoming ones. */
	date: z.string().optional(),
	/** Draft, Pre-release, Overdue… */
	tags: z.array(z.string()).default([]),
});

export type Release = z.infer<typeof releaseSchema>;

/** Released items older than this aren't shown. */
export const RECENT_RELEASE_DAYS = 30;

export interface ReleaseQuery {
	/** Only include releases shipped after this moment. */
	releasedSince: Date;
}

/** Timestamp for a release date; date-only values count from local midnight. */
export function releaseDateMs(date: string): number {
	return /^\d{4}-\d{2}-\d{2}$/.test(date)
		? new Date(`${date}T00:00:00`).getTime()
		: Date.parse(date);
}

/** Upcoming first (soonest first, undated last), then released (newest first). */
export function sortReleases(releases: readonly Release[]): Release[] {
	const time = (r: Release) => (r.date ? releaseDateMs(r.date) : undefined);
	return [...releases].sort((a, b) => {
		if (a.state !== b.state) return a.state === "upcoming" ? -1 : 1;
		const ta = time(a);
		const tb = time(b);
		if (ta === undefined || tb === undefined) {
			return ta === undefined ? (tb === undefined ? 0 : 1) : -1;
		}
		return a.state === "upcoming" ? ta - tb : tb - ta;
	});
}
