import type { SqlDriver } from "@dashboard/platform/db/driver";
import { postHostApiJson } from "./api";

/** `SqlDriver` backed by the server's SQLite (`src/server/sql.ts`). */
export function createRemoteSqlDriver(): SqlDriver {
	const run = (method: "execute" | "select", sql: string, params: unknown[]) =>
		postHostApiJson<{ rows: unknown[][] }>("sql", {
			method,
			sql,
			params: params.map(toSqlValue),
		});
	return {
		async execute(sql, params) {
			await run("execute", sql, params);
		},
		async select(sql, params) {
			return (await run("select", sql, params)).rows;
		},
	};
}

/** The schema only stores text and integers; drizzle hands over primitives. */
function toSqlValue(value: unknown): string | number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "boolean") return value ? 1 : 0;
	if (typeof value === "number" || typeof value === "string") return value;
	if (typeof value === "bigint") return Number(value);
	throw new TypeError(`Unsupported SQL parameter: ${typeof value}`);
}
