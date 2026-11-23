import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { themeInitScript } from "./src/components/appearance/theme-init.ts";

/** Applies the stored theme before first paint (no flash of the wrong theme). */
const themeInit = (): Plugin => ({
	name: "theme-init",
	transformIndexHtml: (html) =>
		html.replace(
			"<!-- theme-init: replaced by the inline theme script (vite.config.ts) -->",
			`<script>${themeInitScript}</script>`,
		),
});

// Tauri loads the dev server from this fixed address (src-tauri/tauri.conf.json).
const DEV_HOST = "127.0.0.1";
const DEV_PORT = 3100;

export default defineConfig({
	resolve: { tsconfigPaths: true },
	clearScreen: false,
	server: {
		host: DEV_HOST,
		port: DEV_PORT,
		strictPort: true,
		// The Rust side rebuilds itself; don't reload the UI for those changes.
		watch: { ignored: ["**/src-tauri/**"] },
	},
	envPrefix: ["VITE_", "TAURI_ENV_"],
	plugins: [
		devtools(),
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		tailwindcss(),
		viteReact(),
		themeInit(),
	],
});
