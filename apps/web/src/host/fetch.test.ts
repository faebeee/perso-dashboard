import { describe, expect, it, vi } from "vitest";
import { createProxyFetch } from "./fetch";

describe("createProxyFetch", () => {
	it("sends the provider request through the host API", async () => {
		const fetchFn = vi.fn<typeof fetch>(async () => new Response("ok"));
		const proxied = createProxyFetch(fetchFn);

		await proxied("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { authorization: "Basic x" },
			body: new URLSearchParams({ code: "1" }),
		});

		const [url, init] = fetchFn.mock.calls[0];
		const headers = new Headers(init?.headers);
		expect(url).toBe("/api/host/fetch");
		expect(init?.method).toBe("POST");
		expect(headers.get("x-dashboard-method")).toBe("POST");
		expect(headers.get("x-dashboard-target")).toBe(
			"https://oauth2.googleapis.com/token",
		);
		expect(headers.get("x-dashboard-host")).toBe("1");
		expect(headers.get("authorization")).toBe("Basic x");
		expect(headers.get("content-type")).toContain(
			"application/x-www-form-urlencoded",
		);
		expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe("code=1");
		expect(init?.cache).toBe("no-store");
	});

	it("posts GET requests to the proxy, with the method in a header", async () => {
		const fetchFn = vi.fn<typeof fetch>(async () => new Response("ok"));
		await createProxyFetch(fetchFn)("https://api.github.com/user");
		const [, init] = fetchFn.mock.calls[0];
		expect(init?.method).toBe("POST");
		expect(new Headers(init?.headers).get("x-dashboard-method")).toBe("GET");
		expect(init?.body).toBeUndefined();
	});
});
