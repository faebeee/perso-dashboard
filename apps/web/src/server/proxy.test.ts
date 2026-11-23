import { describe, expect, it, vi } from "vitest";
import { METHOD_HEADER, proxyProviderRequest, TARGET_HEADER } from "./proxy";

/** What the browser host sends: always POST, the provider's method in a header. */
const proxyRequest = (target: string, init: RequestInit = {}) => {
	const headers = new Headers(init.headers);
	headers.set(TARGET_HEADER, target);
	headers.set(METHOD_HEADER, init.method ?? "POST");
	return new Request("http://127.0.0.1:47390/api/host/fetch", {
		...init,
		method: "POST",
		headers,
	});
};

describe("proxyProviderRequest", () => {
	it("forwards method, API headers and body; drops browser headers", async () => {
		const upstream = vi.fn<typeof fetch>(async () =>
			Response.json({ ok: true }, { headers: { etag: '"abc"' } }),
		);
		const response = await proxyProviderRequest(
			proxyRequest("https://github.com/login/oauth/access_token", {
				headers: {
					authorization: "Bearer t",
					"content-type": "application/x-www-form-urlencoded",
					cookie: "session=1",
					origin: "http://127.0.0.1:47390",
					"sec-fetch-site": "same-origin",
					"x-dashboard-host": "1",
				},
				body: "code=1",
			}),
			upstream,
		);

		const [url, init] = upstream.mock.calls[0];
		const sent = new Headers(init?.headers);
		expect(url).toBe("https://github.com/login/oauth/access_token");
		expect(init?.method).toBe("POST");
		expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe("code=1");
		expect(sent.get("authorization")).toBe("Bearer t");
		expect(sent.get("content-type")).toBe("application/x-www-form-urlencoded");
		for (const name of [
			"cookie",
			"origin",
			"sec-fetch-site",
			"x-dashboard-host",
			TARGET_HEADER,
		]) {
			expect(sent.has(name)).toBe(false);
		}
		expect(sent.get("user-agent")).toBeTruthy();
		expect(response.status).toBe(200);
		expect(response.headers.get("etag")).toBe('"abc"');
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("sends GET requests as GET, without a body", async () => {
		const upstream = vi.fn<typeof fetch>(async () => Response.json({}));
		await proxyProviderRequest(
			proxyRequest("https://api.github.com/user", { method: "GET" }),
			upstream,
		);
		const [, init] = upstream.mock.calls[0];
		expect(init?.method).toBe("GET");
		expect(init?.body).toBeUndefined();
		expect(new Headers(init?.headers).has(METHOD_HEADER)).toBe(false);
	});

	it("refuses unknown methods", async () => {
		const upstream = vi.fn<typeof fetch>();
		const response = await proxyProviderRequest(
			proxyRequest("https://api.github.com/user", { method: "TRACE" }),
			upstream,
		);
		expect(response.status).toBe(400);
		expect(upstream).not.toHaveBeenCalled();
	});

	it("refuses URLs that aren't on the allowlist", async () => {
		const upstream = vi.fn<typeof fetch>();
		const response = await proxyProviderRequest(
			proxyRequest("https://example.com/"),
			upstream,
		);
		expect(response.status).toBe(403);
		expect(upstream).not.toHaveBeenCalled();
	});

	it("relays 304 without a body and strips encoding headers", async () => {
		const response = await proxyProviderRequest(
			proxyRequest("https://api.github.com/user", { method: "GET" }),
			async () =>
				new Response(null, {
					status: 304,
					headers: { "content-encoding": "gzip", etag: '"x"' },
				}),
		);
		expect(response.status).toBe(304);
		expect(response.headers.has("content-encoding")).toBe(false);
		expect(response.headers.get("etag")).toBe('"x"');
	});

	it("follows redirects only to allowed URLs", async () => {
		const redirectTo = (location: string) => async () =>
			new Response(null, { status: 301, headers: { location } });

		const allowed = vi
			.fn<typeof fetch>()
			.mockImplementationOnce(
				redirectTo("https://api.github.com/repositories/1"),
			)
			.mockImplementationOnce(async () => Response.json({ id: 1 }));
		const ok = await proxyProviderRequest(
			proxyRequest("https://api.github.com/repos/a/b", { method: "GET" }),
			allowed,
		);
		expect(ok.status).toBe(200);
		expect(allowed.mock.calls[1][0]).toBe(
			"https://api.github.com/repositories/1",
		);

		const blocked = await proxyProviderRequest(
			proxyRequest("https://api.github.com/repos/a/b", { method: "GET" }),
			redirectTo("https://evil.test/"),
		);
		expect(blocked.status).toBe(502);
	});
});
