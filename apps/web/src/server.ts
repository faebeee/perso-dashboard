import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { dataDirectory } from "./server/config";
import { createHostApi } from "./server/host-api";

const hostApi = createHostApi({ dataDir: dataDirectory() });

/** The host API and OAuth callbacks first, everything else to TanStack Start. */
export default createServerEntry({
	async fetch(request) {
		return (await hostApi(request)) ?? handler.fetch(request);
	},
});
