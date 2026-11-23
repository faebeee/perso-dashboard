/**
 * The app window must never navigate away from the app. Links to other
 * origins (PRs, issues, emails…) open in the system browser instead.
 */
export function installExternalLinkHandler(
	openExternal: (url: string) => Promise<void>,
): () => void {
	const onClick = (event: MouseEvent) => {
		if (event.defaultPrevented || event.button > 1) return;
		const anchor = (event.target as Element | null)?.closest?.("a[href]");
		if (!(anchor instanceof HTMLAnchorElement)) return;

		const url = new URL(anchor.href, window.location.href);
		const external =
			url.origin !== window.location.origin &&
			["http:", "https:", "mailto:"].includes(url.protocol);
		if (!external) return;

		event.preventDefault();
		openExternal(url.toString()).catch((cause) =>
			console.error("Could not open link", cause),
		);
	};
	// Middle clicks fire "auxclick", not "click".
	document.addEventListener("click", onClick);
	document.addEventListener("auxclick", onClick);
	return () => {
		document.removeEventListener("click", onClick);
		document.removeEventListener("auxclick", onClick);
	};
}
