import type { FetchFn } from "@dashboard/platform/host";
import { describe, expect, it, vi } from "vitest";
import { withoutOrigin } from "./fetch";

describe("withoutOrigin", () => {
	it("asks the HTTP plugin to drop Origin and keeps the other headers", async () => {
		const inner = vi.fn<FetchFn>(async () => new Response("ok"));
		await withoutOrigin(inner)("https://sentry.io/api/0/organizations/", {
			method: "GET",
			headers: { Authorization: "Bearer t", Accept: "application/json" },
		});

		const [url, init] = inner.mock.calls[0] ?? [];
		const headers = new Headers(init?.headers);
		expect(String(url)).toBe("https://sentry.io/api/0/organizations/");
		expect(init?.method).toBe("GET");
		expect(headers.get("Origin")).toBe("");
		expect(headers.get("Authorization")).toBe("Bearer t");
		expect(headers.get("Accept")).toBe("application/json");
	});

	it("works without any init", async () => {
		const inner = vi.fn<FetchFn>(async () => new Response("ok"));
		await withoutOrigin(inner)("https://example.com");
		expect(new Headers(inner.mock.calls[0]?.[1]?.headers).get("Origin")).toBe(
			"",
		);
	});
});
