import { useCallback, useEffect, useRef, useState } from "react";
import { useOpenExternal } from "./item-detail-context";

/**
 * Renders untrusted HTML (email bodies, Jira descriptions) in a sandboxed
 * iframe: no scripts, forms, popups or top navigation (`sandbox` without
 * `allow-scripts`), plus a CSP inside the frame. `allow-same-origin` only
 * lets *this* page measure the content and catch link clicks; with scripts
 * disabled the content itself can't use it.
 */

interface SafeHtmlFrameProps {
	html: string;
	/** "paper": white page like a mail client (emails assume a white canvas). */
	appearance?: "paper" | "themed";
	/** Allow https images. Off by default for email (tracking pixels). */
	allowRemoteImages?: boolean;
	/** Resolves relative links/images (e.g. a Jira site URL). */
	baseUrl?: string;
	title: string;
}

export function SafeHtmlFrame({
	html,
	appearance = "themed",
	allowRemoteImages = false,
	baseUrl,
	title,
}: SafeHtmlFrameProps) {
	const ref = useRef<HTMLIFrameElement>(null);
	const [height, setHeight] = useState(80);
	const openExternal = useOpenExternal();

	const theme = frameTheme(appearance);
	const srcDoc = buildDocument(html, {
		theme,
		padded: appearance === "paper",
		allowRemoteImages,
		baseUrl,
	});

	const onLoad = useCallback(() => {
		const doc = ref.current?.contentDocument;
		if (!doc) return;
		const measure = () =>
			setHeight(Math.max(40, doc.documentElement.scrollHeight));
		measure();
		new ResizeObserver(measure).observe(doc.body);
		// Images that fail (auth-only Jira attachments, blocked remote images)
		// would show as broken icons: hide them instead.
		for (const img of Array.from(doc.images)) {
			img.addEventListener("error", () => {
				img.style.display = "none";
			});
			img.addEventListener("load", measure);
		}
		doc.addEventListener("click", (event) => {
			const anchor = (event.target as Element | null)?.closest?.("a[href]");
			if (!anchor) return;
			event.preventDefault();
			const href = (anchor as HTMLAnchorElement).href;
			if (/^(https?|mailto):/i.test(href)) openExternal(href);
		});
	}, [openExternal]);

	// New content → reset height until it's measured again.
	// biome-ignore lint/correctness/useExhaustiveDependencies: srcDoc drives the reset
	useEffect(() => setHeight(80), [srcDoc]);

	return (
		<iframe
			ref={ref}
			title={title}
			sandbox="allow-same-origin"
			srcDoc={srcDoc}
			onLoad={onLoad}
			className="block w-full rounded-md border-0"
			style={{
				height,
				colorScheme: theme.scheme,
				backgroundColor: theme.background,
			}}
		/>
	);
}

function cssVar(name: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
}

/** `<meta http-equiv=refresh>` could navigate the frame to a remote page. */
const stripMetaRefresh = (html: string) =>
	html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, "");

const escapeAttribute = (value: string) =>
	value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** Pure apart from reading theme colours; exported for tests. */
export interface FrameTheme {
	/**
	 * Must match between the frame document and the <iframe> element: when
	 * they differ, the webview paints the frame with an opaque canvas
	 * (white for "light"), whatever the document's own background says.
	 */
	scheme: "light" | "dark";
	background: string;
	text: string;
	muted: string;
	link: string;
	border: string;
}

/** Paper = how mail clients show email; themed = follows the app (light/dark). */
export function frameTheme(appearance: "paper" | "themed"): FrameTheme {
	if (appearance === "paper") {
		return {
			scheme: "light",
			background: "#ffffff",
			text: "#1f1f1f",
			muted: "#5f6368",
			link: "#1a73e8",
			border: "#dadce0",
		};
	}
	const dark = document.documentElement.classList.contains("dark");
	return {
		scheme: dark ? "dark" : "light",
		background: cssVar("--background") || (dark ? "#09090b" : "#ffffff"),
		text: cssVar("--foreground") || (dark ? "#fafafa" : "#09090b"),
		muted: cssVar("--muted-foreground") || "gray",
		link: cssVar("--primary") || "#2563eb",
		border: cssVar("--border") || "#ddd",
	};
}

/** Pure; exported for tests. */
export function buildDocument(
	html: string,
	options: {
		theme: FrameTheme;
		/** Paper adds page padding like a mail client. */
		padded: boolean;
		allowRemoteImages: boolean;
		baseUrl?: string;
	},
): string {
	const { theme } = options;
	const imgSrc = options.allowRemoteImages ? "data: https:" : "data:";

	return `<!doctype html><html><head><meta charset="utf-8">
<meta name="color-scheme" content="${theme.scheme}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src data:">
${options.baseUrl ? `<base href="${escapeAttribute(options.baseUrl)}">` : ""}
<style>
:root{color-scheme:${theme.scheme};}
html,body{margin:0;background:${theme.background};color:${theme.text};}
body{padding:${options.padded ? "16px" : "0"};font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere;}
a{color:${theme.link};}
img{max-width:100%;height:auto;}
pre,code{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;}
blockquote{margin:0 0 0 8px;padding-left:12px;border-left:3px solid ${theme.border};color:${theme.muted};}
table{max-width:100%;border-collapse:collapse;}
p:first-child{margin-top:0}p:last-child{margin-bottom:0}
</style></head><body>${stripMetaRefresh(html)}</body></html>`;
}
