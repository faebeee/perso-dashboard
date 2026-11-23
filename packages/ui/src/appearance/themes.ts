import type { AppearanceId } from "./theme-init";

interface Swatch {
	background: string;
	card: string;
	foreground: string;
	muted: string;
	primary: string;
	/** A highlight the theme uses (Dot's red, Technical's green…). */
	accent: string;
}

export interface ThemeInfo {
	id: AppearanceId;
	name: string;
	description: string;
	/** CSS font stacks for the preview. */
	font: string;
	displayFont: string;
	radius: string;
	/** Preview colours; must match themes.css / styles.css. */
	light: Swatch;
	dark: Swatch;
	texture?: "grid" | "dots";
}

const SYSTEM = "ui-sans-serif, system-ui, sans-serif";
const INTER = "'Inter Variable', ui-sans-serif, system-ui, sans-serif";
const MONO = "'JetBrains Mono Variable', ui-monospace, monospace";
const DOTO = "'Doto Variable', ui-monospace, monospace";

export const THEMES: ThemeInfo[] = [
	{
		id: "default",
		name: "Default",
		description: "Neutral and quiet. The original look.",
		font: SYSTEM,
		displayFont: SYSTEM,
		radius: "10px",
		light: {
			background: "oklch(1 0 0)",
			card: "oklch(1 0 0)",
			foreground: "oklch(0.141 0.005 285.823)",
			muted: "oklch(0.967 0.001 286.375)",
			primary: "oklch(0.21 0.006 285.885)",
			accent: "oklch(0.552 0.016 285.938)",
		},
		dark: {
			background: "oklch(0.141 0.005 285.823)",
			card: "oklch(0.141 0.005 285.823)",
			foreground: "oklch(0.985 0 0)",
			muted: "oklch(0.274 0.006 286.033)",
			primary: "oklch(0.985 0 0)",
			accent: "oklch(0.705 0.015 286.067)",
		},
	},
	{
		id: "technical",
		name: "Technical",
		description:
			"Monospace, tight corners, a blueprint grid and terminal green.",
		font: MONO,
		displayFont: MONO,
		radius: "2px",
		texture: "grid",
		light: {
			background: "oklch(0.985 0.003 250)",
			card: "oklch(1 0 0)",
			foreground: "oklch(0.2 0.02 250)",
			muted: "oklch(0.95 0.008 250)",
			primary: "oklch(0.52 0.14 155)",
			accent: "oklch(0.62 0.14 155)",
		},
		dark: {
			background: "oklch(0.16 0.012 250)",
			card: "oklch(0.19 0.012 250)",
			foreground: "oklch(0.92 0.02 150)",
			muted: "oklch(0.24 0.014 250)",
			primary: "oklch(0.8 0.18 150)",
			accent: "oklch(0.7 0.16 150)",
		},
	},
	{
		id: "business",
		name: "Business",
		description: "Clean type, generous spacing, soft surfaces and a calm blue.",
		font: INTER,
		displayFont: INTER,
		radius: "12px",
		light: {
			background: "oklch(0.982 0.003 250)",
			card: "oklch(1 0 0)",
			foreground: "oklch(0.22 0.03 255)",
			muted: "oklch(0.96 0.008 255)",
			primary: "oklch(0.48 0.16 255)",
			accent: "oklch(0.65 0.12 255)",
		},
		dark: {
			background: "oklch(0.18 0.02 255)",
			card: "oklch(0.215 0.02 255)",
			foreground: "oklch(0.96 0.005 255)",
			muted: "oklch(0.26 0.02 255)",
			primary: "oklch(0.7 0.14 255)",
			accent: "oklch(0.6 0.12 255)",
		},
	},
	{
		id: "dot",
		name: "Dot",
		description:
			"Monochrome with one red signal, dot-matrix type and dotted textures.",
		font: INTER,
		displayFont: DOTO,
		radius: "16px",
		texture: "dots",
		light: {
			background: "oklch(0.965 0 0)",
			card: "oklch(1 0 0)",
			foreground: "oklch(0.13 0 0)",
			muted: "oklch(0.93 0 0)",
			primary: "oklch(0.13 0 0)",
			accent: "oklch(0.6 0.22 27)",
		},
		dark: {
			background: "oklch(0.08 0 0)",
			card: "oklch(0.13 0 0)",
			foreground: "oklch(0.96 0 0)",
			muted: "oklch(0.2 0 0)",
			primary: "oklch(0.96 0 0)",
			accent: "oklch(0.65 0.22 27)",
		},
	},
];

export const themeById = (id: AppearanceId): ThemeInfo =>
	THEMES.find((t) => t.id === id) ?? (THEMES[0] as ThemeInfo);
