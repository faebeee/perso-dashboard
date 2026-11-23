import { describe, expect, it } from "vitest";
import { rejectForeignRequest } from "./guard";

const request = (headers: Record<string, string>) =>
	new Request("http://127.0.0.1:47390/api/host/key", {
		method: "POST",
		headers,
	});

describe("rejectForeignRequest", () => {
	const ok = { host: "127.0.0.1:47390", "x-dashboard-host": "1" };

	it("lets the app's own requests through", () => {
		expect(rejectForeignRequest(request(ok))).toBeNull();
		expect(
			rejectForeignRequest(
				request({
					...ok,
					host: "localhost:47390",
					origin: "http://localhost:47390",
					"sec-fetch-site": "same-origin",
				}),
			),
		).toBeNull();
	});

	it.each([
		["a rebound host name", { ...ok, host: "evil.test:47390" }],
		["no host API header", { host: ok.host }],
		["a cross-site request", { ...ok, "sec-fetch-site": "cross-site" }],
		["a foreign origin", { ...ok, origin: "https://evil.test" }],
	])("rejects %s", (_, headers) => {
		expect(rejectForeignRequest(request(headers))?.status).toBe(403);
	});
});
