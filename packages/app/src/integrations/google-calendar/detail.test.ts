import { describe, expect, it } from "vitest";
import { googleEventDetailSchema } from "./api/schemas";
import { toEventDetail } from "./detail";

const raw = (extra: Record<string, unknown> = {}) =>
	googleEventDetailSchema.parse({
		id: "e1",
		htmlLink: "https://calendar.google.com/event?eid=1",
		summary: "Planning",
		start: { dateTime: "2026-01-05T09:00:00Z" },
		end: { dateTime: "2026-01-05T10:00:00Z" },
		hangoutLink: "https://meet.google.com/abc",
		organizer: { email: "lead@x.com", displayName: "Lead" },
		attendees: [
			{
				email: "lead@x.com",
				displayName: "Lead",
				organizer: true,
				responseStatus: "accepted",
			},
			{ email: "me@x.com", self: true, responseStatus: "tentative" },
			{ email: "bob@x.com", optional: true },
			{
				email: "room@resource.x.com",
				resource: true,
				responseStatus: "accepted",
			},
		],
		...extra,
	});

describe("toEventDetail", () => {
	it("maps organizer and attendees (you marked, rooms dropped)", () => {
		const detail = toEventDetail(raw());
		expect(detail.organizer).toEqual({
			name: "Lead",
			email: "lead@x.com",
			you: false,
		});
		expect(
			detail.attendees.map((a) => [
				a.name,
				a.response,
				a.you,
				a.optional,
				a.organizer,
			]),
		).toEqual([
			["Lead", "accepted", false, false, true],
			["me@x.com", "tentative", true, false, false],
			["bob@x.com", "needsAction", false, true, false],
		]);
		expect(detail.meetingUrl).toBe("https://meet.google.com/abc");
	});

	it("keeps HTML descriptions and converts plain text safely", () => {
		expect(
			toEventDetail(raw({ description: "<b>Agenda</b>" })).descriptionHtml,
		).toBe("<b>Agenda</b>");
		expect(
			toEventDetail(raw({ description: "Notes: https://x.com/doc" }))
				.descriptionHtml,
		).toContain('<a href="https://x.com/doc">');
		expect(toEventDetail(raw()).descriptionHtml).toBeUndefined();
	});
});
