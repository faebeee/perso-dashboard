import { describe, expect, it } from "vitest";
import { buildDailyReview } from "./build-review";
import {
	PROMPT_TIMELINE_LIMIT,
	summarySystemPrompt,
	summaryUserPrompt,
} from "./summary-prompt";

const now = new Date("2026-01-14T09:00:00");
const activity = (id: string, project: string, title: string) => ({
	id,
	source: "github",
	kind: "pr_merged" as const,
	title,
	url: `https://example.test/${id}`,
	at: "2026-01-13T15:00:00.000Z",
	context: `${project} #1`,
	project,
});

const empty = {
	completed: [],
	openToday: [],
	agenda: [],
	waiting: [],
	now,
};

describe("summary prompt", () => {
	it("sends only what the filter keeps, plus notes", () => {
		const review = buildDailyReview({
			...empty,
			activity: [
				activity("a", "acme/web", "Fix checkout"),
				activity("b", "acme/api", "Secret API work"),
			],
			filter: { projects: ["acme/web"], includeUnscoped: false },
		});
		const prompt = summaryUserPrompt({
			periodTitle: "Since Tuesday",
			scope: "Projects: acme/web",
			review,
			notes: ["Demo at 3"],
		});
		expect(prompt).toContain("Fix checkout (acme/web #1)");
		expect(prompt).not.toContain("Secret API work");
		expect(prompt).toContain("## My notes\n- Demo at 3");
		expect(prompt).toContain("Projects: acme/web");
		expect(prompt).toContain("## Blockers (waiting on others)\n- (nothing)");
	});

	it("caps the timeline", () => {
		const review = buildDailyReview({
			...empty,
			activity: Array.from({ length: PROMPT_TIMELINE_LIMIT + 5 }, (_, i) =>
				activity(`x${i}`, "acme/web", `Item ${i}`),
			),
		});
		const prompt = summaryUserPrompt({ periodTitle: "P", review, notes: [] });
		expect(prompt).toContain("… and 5 older entries");
		expect(prompt).not.toContain("## My notes");
	});

	it("asks for the chosen standup format", () => {
		expect(summarySystemPrompt("slack")).toMatch(/Slack/);
		expect(summarySystemPrompt("markdown")).toMatch(/Markdown/);
	});
});
