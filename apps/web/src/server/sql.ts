import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { z } from "zod";

export const sqlRequestSchema = z.object({
	method: z.enum(["execute", "select"]),
	sql: z.string(),
	params: z.array(z.union([z.string(), z.number(), z.null()])),
});
export type SqlRequest = z.infer<typeof sqlRequestSchema>;

/**
 * The server half of the browser's `SqlDriver`: the same SQLite the desktop
 * app uses, through Node's built-in driver. Migrations are applied by the
 * app itself (`createDatabase`), exactly as on the desktop.
 */
export function openSqlDatabase(dataDir: string): DatabaseSync {
	mkdirSync(dataDir, { recursive: true, mode: 0o700 });
	const db = new DatabaseSync(join(dataDir, "dashboard.db"));
	db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
	return db;
}

export function runSql(db: DatabaseSync, request: SqlRequest): unknown[][] {
	const statement = db.prepare(request.sql);
	const params = request.params as SQLInputValue[];
	if (request.method === "execute") {
		statement.run(...params);
		return [];
	}
	statement.setReturnArrays(true);
	return statement.all(...params) as unknown as unknown[][];
}
