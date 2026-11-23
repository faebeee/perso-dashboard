/** A titled list of lines, e.g. "Done" / "Today" / "Blockers". */
export interface StandupSection {
	title: string;
	lines: string[];
}

export type StandupFormat = "markdown" | "slack" | "plain";

const STYLE: Record<
	StandupFormat,
	{ heading: (t: string) => string; bullet: string }
> = {
	markdown: { heading: (t) => `**${t}**`, bullet: "- " },
	// Slack's mrkdwn uses single asterisks for bold.
	slack: { heading: (t) => `*${t}*`, bullet: "• " },
	plain: { heading: (t) => t, bullet: "- " },
};

/** Pure: sections → text for a standup channel. Empty sections say "Nothing". */
export function formatStandup(
	sections: readonly StandupSection[],
	format: StandupFormat,
): string {
	const { heading, bullet } = STYLE[format];
	return sections
		.map((section) => {
			const lines =
				section.lines.length > 0
					? section.lines.map((line) => `${bullet}${line}`)
					: [`${bullet}Nothing`];
			return [heading(section.title), ...lines].join("\n");
		})
		.join("\n\n");
}
