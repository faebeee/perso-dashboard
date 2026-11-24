import type { ActivityItem } from "@dashboard/core/insights";
import type { WorkItem } from "@dashboard/core/work-item";
import { describe, expect, it } from "vitest";
import { activityRange } from "./fetchers";
import { eventsFromActivity, eventsFromWorkItems } from "./stream-events";

describe("stream events", () => {
	it("turns a feed item into its latest change", () => {
		const item: WorkItem = {
			id: "jira:ABC-1",
			source: "jira",
			kind: "issue",
			title: "Fix login",
			url: "https://x/ABC-1",
			updatedAt: "2026-11-24T10:00:00.000Z",
			context: "ABC-1",
			status: "In progress",
			actor: { name: "Ada" },
			detailRef: "ABC-1",
		};
		const [event] = eventsFromWorkItems([item]);
		expect(event).toMatchObject({
			id: "jira:ABC-1@2026-11-24T10:00:00.000Z",
			verb: "Ticket updated",
			kind: "issue",
			at: item.updatedAt,
			status: "In progress",
			detailRef: "ABC-1",
		});
		// The next update of the same ticket is another entry.
		const [next] = eventsFromWorkItems([
			{ ...item, updatedAt: "2026-11-24T11:00:00.000Z" },
		]);
		expect(next?.id).not.toBe(event?.id);
	});

	it("turns activity into entries and leaves meetings out", () => {
		const activity = (kind: ActivityItem["kind"]): ActivityItem => ({
			id: `github:${kind}`,
			source: "github",
			kind,
			title: kind,
			url: `https://x/${kind}`,
			at: "2026-11-24T09:00:00Z",
			project: "acme/web",
		});
		const events = eventsFromActivity([
			activity("commit"),
			activity("meeting"),
			activity("pr_merged"),
		]);
		expect(events.map((e) => [e.kind, e.verb, e.context])).toEqual([
			["commit", "Commit", "acme/web"],
			["pull_request", "You merged", "acme/web"],
		]);
	});
});

describe("activityRange", () => {
	it("covers whole days and stays the same during a day", () => {
		const morning = activityRange(new Date(2026, 10, 24, 8, 0).getTime());
		const evening = activityRange(new Date(2026, 10, 24, 22, 0).getTime());
		expect(morning).toEqual(evening);
		expect(morning.from).toEqual(new Date(2026, 10, 21));
		expect(morning.to).toEqual(new Date(2026, 10, 25));
	});
});
