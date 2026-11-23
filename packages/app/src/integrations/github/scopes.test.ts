import { describe, expect, it } from "vitest";
import { hasGitHubScope } from "./scopes";

describe("hasGitHubScope", () => {
	it.each([
		[["repo"], "security_events", true],
		[["security_events"], "security_events", true],
		[["read:user"], "security_events", false],
		[["user"], "read:user", true],
		[["read:user"], "user", false],
		[[], "repo", false],
	] as const)("%j covers %s: %s", (granted, needed, expected) => {
		expect(hasGitHubScope(granted, needed)).toBe(expected);
	});
});
