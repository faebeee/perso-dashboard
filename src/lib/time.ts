const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["week", 7 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "YYYY-MM-DD" in the viewer's time zone. */
export function localDayKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 150 → "2h 30m", 45 → "45m". */
export function formatDuration(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	const hours = Math.floor(total / 60);
	const rest = total % 60;
	if (hours === 0) return `${rest}m`;
	return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

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
