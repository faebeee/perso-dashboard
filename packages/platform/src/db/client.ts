import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { SqlDriver } from "./driver";
import * as schema from "./schema";

export type AppDatabase = SqliteRemoteDatabase<typeof schema>;

/**
 * Drizzle migrations (`npm run db:generate`), bundled at build time.
 * Keyed by path, e.g. "../../drizzle/0000_init.sql".
 */
const MIGRATIONS = import.meta.glob<string>("../../drizzle/*.sql", {
	query: "?raw",
	import: "default",
	eager: true,
});

const MIGRATIONS_TABLE = "__app_migrations";
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/** Wraps a driver in drizzle and applies pending migrations. */
export async function createDatabase(driver: SqlDriver): Promise<AppDatabase> {
	await migrate(driver, MIGRATIONS);
	return drizzle(
		async (sql, params, method) => {
			if (method === "run") {
				await driver.execute(sql, params);
				return { rows: [] };
			}
			const rows = await driver.select(sql, params);
			// For "get", drizzle expects the single row itself (undefined = no row).
			return { rows: method === "get" ? (rows[0] as unknown[]) : rows };
		},
		{ schema },
	);
}

/** Applies each not-yet-applied migration file, in file name order. */
export async function migrate(
	driver: SqlDriver,
	files: Record<string, string>,
): Promise<void> {
	await driver.execute(
		`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (tag TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)`,
		[],
	);
	const applied = new Set(
		(await driver.select(`SELECT tag FROM ${MIGRATIONS_TABLE}`, [])).map(
			([tag]) => String(tag),
		),
	);

	const pending = Object.entries(files)
		.map(([path, sql]) => ({ tag: migrationTag(path), sql }))
		.filter(({ tag }) => !applied.has(tag))
		.sort((a, b) => a.tag.localeCompare(b.tag));

	for (const { tag, sql } of pending) {
		for (const statement of sql.split(STATEMENT_BREAKPOINT)) {
			if (statement.trim()) await driver.execute(statement, []);
		}
		await driver.execute(
			`INSERT INTO ${MIGRATIONS_TABLE} (tag, applied_at) VALUES (?, ?)`,
			[tag, Date.now()],
		);
	}
}

function migrationTag(path: string): string {
	return (path.split("/").pop() ?? path).replace(/\.sql$/, "");
}
