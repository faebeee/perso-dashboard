import { describe, expect, it } from "vitest";
import {
	REDIRECT_URI_PLACEHOLDER,
	resolveSetupGuide,
} from "#/core/integration";
import { integrationManifests } from "./registry";

const usesRedirect = (id: string) =>
	JSON.stringify(
		integrationManifests.find((m) => m.id === id)?.setupGuide,
	).includes(REDIRECT_URI_PLACEHOLDER);

describe("setup guides", () => {
	it("exist for every integration and have steps", () => {
		for (const manifest of integrationManifests) {
			expect(manifest.setupGuide?.steps.length, manifest.id).toBeGreaterThan(0);
		}
	});

	it("ask for the redirect URI where the provider matches it exactly", () => {
		for (const id of [
			"github",
			"jira",
			"sentry",
			"outlook",
			"outlook-calendar",
		]) {
			expect(usesRedirect(id), id).toBe(true);
		}
		// Google "Desktop app" clients accept any loopback port: nothing to register.
		expect(usesRedirect("gmail")).toBe(false);
	});

	it("fills in the redirect URI", () => {
		const guide = resolveSetupGuide(
			{
				steps: [
					{
						title: "t",
						text: `Paste ${REDIRECT_URI_PLACEHOLDER}`,
						copy: [{ label: "URL", value: REDIRECT_URI_PLACEHOLDER }],
					},
				],
			},
			"http://127.0.0.1:47390/oauth/x/callback",
		);
		expect(guide.steps[0]?.text).toBe(
			"Paste http://127.0.0.1:47390/oauth/x/callback",
		);
		expect(guide.steps[0]?.copy?.[0]?.value).toBe(
			"http://127.0.0.1:47390/oauth/x/callback",
		);
	});
});
