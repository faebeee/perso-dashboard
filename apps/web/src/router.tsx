import { createAppRouter } from "@dashboard/app/router";
import { Document, documentHead } from "./document";

/** TanStack Start's router entry: the shared app inside the web document. */
export function getRouter() {
	return createAppRouter({
		root: { shellComponent: Document, head: documentHead },
	});
}
