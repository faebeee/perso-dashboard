import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOAuthRelay, OAuthRelayError } from "./oauth-relay";

const STATE = "state-0123456789abcdef";
const callback = (state = STATE) =>
	new URL(
		`http://localhost:47390/oauth/microsoft/callback?code=c&state=${state}`,
	);

describe("OAuth relay", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("hands the redirect to the waiting app", async () => {
		const relay = createOAuthRelay();
		relay.expect(STATE, 60_000);
		const waiting = relay.wait(STATE, 25_000);
		expect(relay.deliver(callback())).toBe(true);
		await expect(waiting).resolves.toEqual(callback());
	});

	it("keeps the redirect for a poll that reconnects late", async () => {
		const relay = createOAuthRelay();
		relay.expect(STATE, 60_000);
		relay.deliver(callback());
		await expect(relay.wait(STATE, 25_000)).resolves.toEqual(callback());
	});

	it("refuses callbacks nobody is waiting for, and replays", () => {
		const relay = createOAuthRelay();
		expect(relay.deliver(callback())).toBe(false);
		relay.expect(STATE, 60_000);
		expect(relay.deliver(callback("other-state-0123456"))).toBe(false);
		expect(relay.deliver(callback())).toBe(true);
		expect(relay.deliver(callback())).toBe(false);
	});

	it("answers null when a poll ends without a redirect", async () => {
		const relay = createOAuthRelay();
		relay.expect(STATE, 60_000);
		const waiting = relay.wait(STATE, 25_000);
		vi.advanceTimersByTime(25_000);
		await expect(waiting).resolves.toBeNull();
	});

	it("times out after the flow's deadline", async () => {
		let now = 0;
		const relay = createOAuthRelay(() => now);
		relay.expect(STATE, 10_000);
		const waiting = relay.wait(STATE, 25_000);
		now = 10_000;
		vi.advanceTimersByTime(10_000);
		await expect(waiting).rejects.toEqual(new OAuthRelayError("timeout"));
		expect(relay.deliver(callback())).toBe(false);
	});

	it("rejects a waiting poll when the app cancels", async () => {
		const relay = createOAuthRelay();
		relay.expect(STATE, 60_000);
		const waiting = relay.wait(STATE, 25_000);
		relay.cancel(STATE);
		await expect(waiting).rejects.toEqual(new OAuthRelayError("cancelled"));
	});

	it("rejects polls for unknown flows", async () => {
		await expect(createOAuthRelay().wait(STATE, 1000)).rejects.toEqual(
			new OAuthRelayError("unknown"),
		);
	});
});
