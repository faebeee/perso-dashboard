const escapeHtml = (text: string) =>
	text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

/** Plain text → safe HTML: escaped, links clickable, line breaks kept. */
export function textToHtml(text: string): string {
	const linked = escapeHtml(text).replace(
		/\bhttps?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/g,
		(url) => `<a href="${url}">${url}</a>`,
	);
	return `<div style="white-space:pre-wrap">${linked}</div>`;
}
