import { z } from "zod";

/**
 * Whose work a widget shows. Integrations translate this into their own
 * query language (JQL, GitHub search qualifiers…).
 */
export const workScopeSchema = z.enum(["all", "assigned", "created"]);

export type WorkScope = z.infer<typeof workScopeSchema>;

export const WORK_SCOPE_LABELS: Record<WorkScope, string> = {
	all: "All",
	assigned: "Assigned to me",
	created: "Created by me",
};
