import { describe, expect, it } from "vitest";
import { isAllowedProviderUrl } from "./http-allowlist";

describe("isAllowedProviderUrl", () => {
	it.each([
		"https://api.github.com/search/issues?q=is:open",
		"https://github.com/login/oauth/access_token",
		"https://de.sentry.io/api/0/organizations/",
		"https://graph.microsoft.com/v1.0/me/messages",
	])("allows %s", (url) => {
		expect(isAllowedProviderUrl(url)).toBe(true);
	});

	it.each([
		"http://api.github.com/user",
		"https://github.com/settings",
		"https://api.github.com.evil.test/user",
		"https://evil.test/?https://api.github.com/",
		"https://user:pw@api.github.com/user",
		"https://api.github.com:8443/user",
		"https://sentry.io/oauth/token/extra",
		"https://127.0.0.1:47390/api/host/sql",
		"not a url",
	])("rejects %s", (url) => {
		expect(isAllowedProviderUrl(url)).toBe(false);
	});
});
