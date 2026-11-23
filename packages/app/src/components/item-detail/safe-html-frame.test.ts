import { describe, expect, it } from "vitest";
import { buildDocument, type FrameTheme } from "./safe-html-frame";

const light: FrameTheme = {
	scheme: "light",
	background: "#ffffff",
	text: "#000",
	muted: "#666",
	link: "#00f",
	border: "#ccc",
};
const dark: FrameTheme = {
	...light,
	scheme: "dark",
	background: "#111",
	text: "#eee",
};
const csp = (doc: string) =>
	/Content-Security-Policy" content="([^"]*)"/.exec(doc)?.[1] ?? "";

describe("buildDocument", () => {
	it("forbids scripts and everything else by default", () => {
		const doc = buildDocument("<p>hi</p>", {
			theme: light,
			padded: false,
			allowRemoteImages: false,
		});
		expect(csp(doc)).toBe(
			"default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:",
		);
		expect(csp(doc)).not.toMatch(/script-src/);
		expect(doc).toContain("<body><p>hi</p></body>");
	});

	it("only allows https images when asked", () => {
		const doc = buildDocument("", {
			theme: light,
			padded: true,
			allowRemoteImages: true,
		});
		expect(csp(doc)).toContain("img-src data: https:");
		expect(doc).toContain("background:#ffffff");
		expect(doc).toContain("padding:16px");
	});

	it("declares its colour scheme and paints its own background (dark mode)", () => {
		const doc = buildDocument("<p>x</p>", {
			theme: dark,
			padded: false,
			allowRemoteImages: false,
		});
		// Without a matching scheme the webview paints the frame white,
		// leaving light text on white.
		expect(doc).toContain('<meta name="color-scheme" content="dark">');
		expect(doc).toContain(":root{color-scheme:dark;}");
		expect(doc).toContain("html,body{margin:0;background:#111;color:#eee;}");
	});

	it("strips meta refresh redirects", () => {
		const doc = buildDocument(
			'<META HTTP-EQUIV="Refresh" content="0; url=https://evil.test"><p>x</p>',
			{ theme: light, padded: true, allowRemoteImages: false },
		);
		expect(doc).not.toMatch(/refresh/i);
		expect(doc).toContain("<p>x</p>");
	});

	it("escapes the base URL", () => {
		const doc = buildDocument("", {
			theme: light,
			padded: false,
			allowRemoteImages: false,
			baseUrl: 'https://x.com/"><script>',
		});
		expect(doc).toContain('<base href="https://x.com/&quot;><script>">');
	});
});
