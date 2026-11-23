import { SquareKanban } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ItemIcon } from "./item-icon";
import { SourceProvider } from "./source-context";

const render = (withProvider: boolean) =>
	renderToStaticMarkup(
		withProvider
			? createElement(SourceProvider, {
					sources: {
						jira: { name: "Jira", icon: SquareKanban, accent: "#1868db" },
					},
					// biome-ignore lint/correctness/noChildrenProp: createElement without JSX
					children: createElement(ItemIcon, { source: "jira", kind: "issue" }),
				})
			: createElement(ItemIcon, { source: "jira", kind: "issue" }),
	);

describe("ItemIcon", () => {
	it("labels the source and kind and tints with the source colour", () => {
		const html = render(true);
		expect(html).toContain('title="Jira · Issue"');
		expect(html).toContain("color:#1868db");
		expect(html).toContain('<span class="sr-only">Jira · Issue</span>');
	});

	it("falls back to the raw source id without a registry", () => {
		const html = render(false);
		expect(html).toContain('title="jira · Issue"');
		expect(html).not.toContain("color:");
	});
});
