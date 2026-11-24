/**
 * Root query keys. Integration keys share a prefix so connecting or
 * disconnecting can invalidate a single integration's data at once.
 */
export const queryKeys = {
	integrations: ["integration"] as const,
	connections: ["connections"] as const,
	layout: ["layout"] as const,
	/** Data combined from several integrations (feed, releases…). */
	combined: ["combined"] as const,
	feed: ["combined", "feed"] as const,
	releases: ["combined", "releases"] as const,
	attention: ["combined", "attention"] as const,
	stream: ["combined", "stream"] as const,
	/** Local state, not provider data: never part of "combined" refreshes. */
	dismissals: ["local", "dismissals"] as const,
	today: ["local", "today"] as const,
	streamDismissals: ["local", "stream-dismissals"] as const,
};

export const integrationQueryKey = (integrationId: string) =>
	[...queryKeys.integrations, integrationId] as const;
