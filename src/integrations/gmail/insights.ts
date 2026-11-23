import type { MetricSeries } from "#/core/insights";
import { GMAIL_ID } from "./constants";

/** Gmail accepts Unix seconds in after:/before:, so ranges are exact. */
const epoch = (date: Date) => Math.floor(date.getTime() / 1000);

export const insightQueries = {
	sent: (from: Date, to: Date) =>
		`in:sent after:${epoch(from)} before:${epoch(to)} -in:chats`,
	received: (from: Date, to: Date) =>
		`in:inbox after:${epoch(from)} before:${epoch(to)} -in:chats`,
};

/** Pure: Gmail's per-week result estimates → series (approximate by nature). */
export function mailMetrics(estimates: {
	received: number[];
	sent: number[];
}): MetricSeries[] {
	return [
		{
			id: "gmail.received",
			source: GMAIL_ID,
			label: "Emails received",
			unit: "count",
			description: "Messages that arrived in your inbox (Gmail's estimate).",
			approximate: true,
			values: estimates.received,
		},
		{
			id: "gmail.sent",
			source: GMAIL_ID,
			label: "Emails sent",
			unit: "count",
			description: "Messages you sent (Gmail's estimate).",
			approximate: true,
			values: estimates.sent,
		},
	];
}
