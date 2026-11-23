import { readFileSync } from "node:fs";
import { PROVIDER_URL_PATTERNS } from "@dashboard/platform/http-allowlist";
import { describe, expect, it } from "vitest";

const capabilities = JSON.parse(
	readFileSync(
		new URL("../../src-tauri/capabilities/default.json", import.meta.url),
		"utf8",
	),
) as {
	permissions: (string | { identifier: string; allow: { url: string }[] })[];
};

describe("Tauri HTTP capability", () => {
	it("allows exactly the shared provider URLs", () => {
		const http = capabilities.permissions.find(
			(p) => typeof p === "object" && p.identifier === "http:default",
		);
		const urls = typeof http === "object" ? http.allow.map((a) => a.url) : [];
		expect(urls.sort()).toEqual([...PROVIDER_URL_PATTERNS].sort());
	});
});
