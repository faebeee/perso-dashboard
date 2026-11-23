import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APPEARANCE_IDS, themeInitScript } from "./theme-init";
import { THEMES } from "./themes";

const read = (file: string) =>
	readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const themesCss = read("themes.css");
const stylesCss = read("styles.css");

/** Token value inside the block that starts with `selector {`. */
function token(
	css: string,
	selector: string,
	name: string,
): string | undefined {
	// Formatters may switch quote styles in attribute selectors.
	const start = css
		.replace(/'/g, '"')
		.indexOf(`${selector.replace(/'/g, '"')} {`);
	if (start === -1) return undefined;
	const normalized = css.replace(/'/g, '"');
	const block = normalized.slice(start, normalized.indexOf("}", start));
	return new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
}

const selectors = (id: string) =>
	id === "default"
		? { light: ":root", dark: ".dark", css: stylesCss }
		: {
				light: `:root[data-theme='${id}']`,
				dark: `:root[data-theme='${id}'].dark`,
				css: themesCss,
			};

describe("themes", () => {
	it("cover every appearance id", () => {
		expect(THEMES.map((t) => t.id)).toEqual([...APPEARANCE_IDS]);
	});

	it.each(
		THEMES.map((t) => [t.id, t] as const),
	)("%s previews use the stylesheet's colours", (id, theme) => {
		const { light, dark, css } = selectors(id);
		for (const [mode, selector] of [
			["light", light],
			["dark", dark],
		] as const) {
			expect(token(css, selector, "background"), `${mode} background`).toBe(
				theme[mode].background,
			);
			expect(token(css, selector, "primary"), `${mode} primary`).toBe(
				theme[mode].primary,
			);
		}
	});
});

describe("themeInitScript", () => {
	function boot(stored: Record<string, string>) {
		const classes = new Set<string>();
		const root = {
			dataset: {} as Record<string, string>,
			classList: {
				toggle: (c: string, on: boolean) =>
					on ? classes.add(c) : classes.delete(c),
			},
		};
		new Function("localStorage", "matchMedia", "document", themeInitScript)(
			{ getItem: (k: string) => stored[k] ?? null },
			() => ({ matches: false }),
			{ documentElement: root },
		);
		return { theme: root.dataset.theme, dark: classes.has("dark") };
	}

	it("applies a stored theme and mode before first paint", () => {
		expect(boot({ appearance: "dot", theme: "dark" })).toEqual({
			theme: "dot",
			dark: true,
		});
	});

	it("ignores unknown themes and leaves the default unmarked", () => {
		expect(boot({ appearance: "neon" }).theme).toBeUndefined();
		expect(boot({ appearance: "default" }).theme).toBeUndefined();
		expect(boot({}).dark).toBe(false);
	});
});
