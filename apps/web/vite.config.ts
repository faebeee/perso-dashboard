import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { WEB_HOST, WEB_PORT } from "./src/server/config";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	server: { host: WEB_HOST, port: WEB_PORT, strictPort: true },
	preview: { host: WEB_HOST, port: WEB_PORT, strictPort: true },
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});
