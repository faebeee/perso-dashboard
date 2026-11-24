import { describe, expect, it } from "vitest";
import { isPlainEmail, withPeopleQuery } from "./gmail/constants";
import { withPeopleSearch } from "./outlook/constants";

const since = new Date(2026, 0, 5);

describe("searching mail by attendees", () => {
	it("accepts plain addresses only", () => {
		expect(isPlainEmail("ada.l+x@acme-corp.ch")).toBe(true);
		for (const crafted of [
			"x} in:anywhere {",
			"a@b.ch OR subject:secret",
			'"evil"@acme.ch',
			"a@b",
			"",
		])
			expect(isPlainEmail(crafted)).toBe(false);
	});

	it("drops crafted addresses from the Gmail query", () => {
		expect(
			withPeopleQuery(["ada@acme.ch", "x} in:anywhere {@a.ch"], since),
		).toBe(
			"{from:ada@acme.ch to:ada@acme.ch cc:ada@acme.ch} after:2026/1/5 -in:chats",
		);
	});

	it("searches nothing rather than everything when no address is usable", () => {
		expect(withPeopleQuery(["x} in:anywhere {"], since)).toBeNull();
		expect(withPeopleQuery([], since)).toBeNull();
		expect(withPeopleSearch(['a" OR "b'])).toBeNull();
	});

	it("builds the Outlook KQL from plain addresses", () => {
		expect(withPeopleSearch(["ada@acme.ch", "bob@acme.ch"])).toBe(
			'"participants:ada@acme.ch OR participants:bob@acme.ch"',
		);
	});
});
