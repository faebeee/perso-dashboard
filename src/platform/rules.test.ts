import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ATTENTION_RULES } from "#/core/attention";
import type { CalendarEvent } from "#/core/calendar-event";
import { type IntegrationSetting, stringListSetting } from "#/core/integration";
import { eventsToAttention } from "#/integrations/google-calendar/attention";
import { releaseStatusFilter } from "#/integrations/jira/constants";
import {
	integrationSettingsFor,
	preferences,
	setIntegrationSetting,
} from "./preferences";

const setting: IntegrationSetting = {
	key: "releaseStatuses",
	label: "Release statuses",
	description: "",
	type: "string-list",
	default: ["On Release"],
};

describe("rules and settings in preferences", () => {
	beforeEach(() => {
		const store = new Map<string, string>();
		globalThis.localStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => void store.set(k, v),
			removeItem: (k: string) => void store.delete(k),
			clear: () => store.clear(),
			key: () => null,
			length: 0,
		} as Storage;
	});

	it("fills in integration setting defaults and stores overrides", () => {
		const backend = { id: "jira-test", settings: [setting] };
		expect(integrationSettingsFor(backend)).toEqual({
			releaseStatuses: ["On Release"],
		});
		setIntegrationSetting("jira-test", "releaseStatuses", ["Ready", "QA done"]);
		expect(stringListSetting(integrationSettingsFor(backend), setting)).toEqual(
			["Ready", "QA done"],
		);
	});

	it("falls back to the default for missing or invalid values", () => {
		expect(stringListSetting({}, setting)).toEqual(["On Release"]);
		expect(stringListSetting({ releaseStatuses: [] }, setting)).toEqual([
			"On Release",
		]);
		expect(stringListSetting({ releaseStatuses: [1] }, setting)).toEqual([
			"On Release",
		]);
	});

	it("keeps defaults for rules until changed", () => {
		expect(preferences.get().attentionRules).toEqual(DEFAULT_ATTENTION_RULES);
	});
});

describe("rules change what's urgent", () => {
	it("uses the given meeting window", () => {
		const now = new Date(2026, 0, 5, 10, 0);
		const meeting: CalendarEvent = {
			id: "m",
			source: "google-calendar",
			title: "Sync",
			url: "#",
			start: new Date(2026, 0, 5, 10, 25).toISOString(),
			end: new Date(2026, 0, 5, 11, 0).toISOString(),
			allDay: false,
			isOrganizer: true,
		};
		expect(eventsToAttention([meeting], now)[0]?.urgency).toBe("today");
		expect(
			eventsToAttention([meeting], now, {
				...DEFAULT_ATTENTION_RULES,
				meetingNowMinutes: 30,
			})[0]?.urgency,
		).toBe("now");
		expect(
			eventsToAttention([meeting], now, {
				...DEFAULT_ATTENTION_RULES,
				meetingSoonMinutes: 20,
			}),
		).toEqual([]);
	});
});

describe("releaseStatusFilter", () => {
	it("quotes and escapes statuses for JQL", () => {
		expect(releaseStatusFilter(["On Release", 'Say "go"'])).toBe(
			'status IN ("On Release", "Say \\"go\\"")',
		);
	});
});
