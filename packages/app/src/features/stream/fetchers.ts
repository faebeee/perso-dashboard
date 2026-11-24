import { getServices } from "@dashboard/platform/services";

export async function fetchStreamDismissals(): Promise<string[]> {
	return (await getServices()).streamDismissals.list();
}

export async function dismissStreamEvents(ids: readonly string[]) {
	await (await getServices()).streamDismissals.dismiss(ids);
}

export async function restoreStreamEvents(ids: readonly string[]) {
	await (await getServices()).streamDismissals.restore(ids);
}
