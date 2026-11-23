export const SENTRY_ID = "sentry";

/** Read-only: organizations, projects and issues/events. */
export const SENTRY_SCOPES = ["org:read", "project:read", "event:read"];

/** Sentry's cloud; organizations may live on a region host (de.sentry.io…). */
export const SENTRY_BASE_URL = "https://sentry.io";

/** Results per issue search: lists are capped at this size. */
export const ISSUE_PAGE_SIZE = 25;

/** Organizations queried (one request per org and list). */
export const ORG_LIMIT = 5;

/** Sentry search queries (issue search syntax). */
export const SENTRY_QUERIES = {
	/** Unresolved issues assigned to you or one of your teams. */
	assigned: "is:unresolved assigned:[me, my_teams]",
	/** Only assigned to you personally (for the feed). */
	assignedToMe: "is:unresolved assigned:me",
	/** First seen recently (Sentry's "new" substatus, ~7 days). */
	new: "is:unresolved is:new",
	/** Event volume spiking well above the issue's baseline. */
	escalating: "is:unresolved is:escalating",
	/** Resolved before, happening again. */
	regressed: "is:unresolved is:regressed",
} as const;
