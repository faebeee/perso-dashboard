const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["week", 7 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago", "yesterday", "just now". */
export function formatRelative(iso: string, now: number = Date.now()): string {
	const seconds = Math.round((Date.parse(iso) - now) / 1000);
	for (const [unit, size] of UNITS) {
		if (Math.abs(seconds) >= size) {
			return formatter.format(Math.round(seconds / size), unit);
		}
	}
	return "just now";
}
