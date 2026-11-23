import { installExternalLinkHandler } from "@dashboard/app/external-links";
import { setHost } from "@dashboard/platform/host";
import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { createWebHost } from "./host/host";

// Composition root: pick the host before anything touches the platform.
const host = createWebHost();
setHost(host);
// Links to providers open in a new tab instead of replacing the dashboard.
installExternalLinkHandler((url) => host.openExternal(url));

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<StartClient />
		</StrictMode>,
	);
});
