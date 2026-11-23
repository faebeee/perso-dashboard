import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SqlDriver } from "@dashboard/platform/db/driver";

/** In-memory SQLite (Node's built-in driver) standing in for the Tauri plugin. */
export function createMemorySqlDriver(): SqlDriver & { db: DatabaseSync } {
	const db = new DatabaseSync(":memory:");
	const params = (values: unknown[]) => values as SQLInputValue[];
	return {
		db,
		async execute(sql, values) {
			db.prepare(sql).run(...params(values));
		},
		async select(sql, values) {
			const statement = db.prepare(sql);
			statement.setReturnArrays(true);
			return statement.all(...params(values)) as unknown as unknown[][];
		},
	};
}
