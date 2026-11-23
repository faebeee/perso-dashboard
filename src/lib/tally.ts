export interface TallyRow {
	label: string;
	value: number;
}

/**
 * Groups items by `key` and sums `weight` (default: count). Items without a
 * key are skipped. Sorted by value, highest first, then by label.
 */
export function tally<T>(
	items: readonly T[],
	key: (item: T) => string | undefined,
	weight: (item: T) => number = () => 1,
): TallyRow[] {
	const totals = new Map<string, number>();
	for (const item of items) {
		const label = key(item);
		if (label === undefined) continue;
		totals.set(label, (totals.get(label) ?? 0) + weight(item));
	}
	return [...totals]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
