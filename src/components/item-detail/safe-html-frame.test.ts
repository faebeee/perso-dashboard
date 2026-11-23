import { describe, expect, it } from "vitest";
import { buildDocument } from "./safe-html-frame";

const colors = { text: "#000", muted: "#666", link: "#00f", border: "#ccc" };
const csp = (doc: string) =>
	/Content-Security-Policy" content="([^"]*)"/.exec(doc)?.[1] ?? "";

describe("buildDocument", () => {
	it("forbids scripts and everything else by default", () => {
		const doc = buildDocument("<p>hi</p>", {
			appearance: "themed",
			allowRemoteImages: false,
			colors,
		});
		expect(csp(doc)).toBe(
			"default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:",
		);
		expect(csp(doc)).not.toMatch(/script-src/);
		expect(doc).toContain("<body><p>hi</p></body>");
	});

	it("only allows https images when asked", () => {
		const doc = buildDocument("", {
			appearance: "paper",
			allowRemoteImages: true,
			colors,
		});
		expect(csp(doc)).toContain("img-src data: https:");
		expect(doc).toContain("background:#ffffff");
	});

	it("strips meta refresh redirects", () => {
		const doc = buildDocument(
			'<META HTTP-EQUIV="Refresh" content="0; url=https://evil.test"><p>x</p>',
			{ appearance: "paper", allowRemoteImages: false, colors },
		);
		expect(doc).not.toMatch(/refresh/i);
		expect(doc).toContain("<p>x</p>");
	});

	it("escapes the base URL", () => {
		const doc = buildDocument("", {
			appearance: "themed",
			allowRemoteImages: false,
			baseUrl: 'https://x.com/"><script>',
			colors,
		});
		expect(doc).toContain('<base href="https://x.com/&quot;><script>">');
	});
});
