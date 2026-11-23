/** Freshness presets for API clients' `ttl` option. */
export const TTL = {
	/** Lists that change often (search results, inboxes, calendars). */
	list: 2 * 60_000,
	/** Things that change rarely (releases, versions, thread metadata). */
	slow: 10 * 60_000,
	/** Identity and structure (profile, organizations, sites). */
	stable: 24 * 60 * 60_000,
} as const;

/** First matching rule wins; falls back to `fallback`. */
export function ttlByPath(
	rules: readonly [RegExp, number][],
	fallback: number,
): (url: URL) => number {
	return (url) =>
		rules.find(([pattern]) => pattern.test(url.pathname))?.[1] ?? fallback;
}
