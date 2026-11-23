import { createStart } from "@tanstack/react-start";

/**
 * The app runs in the browser: its data lives behind the `Host` port, which
 * only exists client-side. The server renders the document shell and serves
 * the host API (`src/server.ts`), nothing else.
 */
export const startInstance = createStart(() => ({ defaultSsr: false }));
