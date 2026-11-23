import "@tanstack/react-start/server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import {
	type BetterSQLite3Database,
	drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");

/**
 * Opens (or creates) the SQLite database and applies pending migrations.
 * Pass ":memory:" for tests.
 */
export function createDatabase(path: string): AppDatabase {
	if (path !== ":memory:") {
		mkdirSync(dirname(resolve(path)), { recursive: true });
	}
	const sqlite = new Database(path);
	sqlite.pragma("journal_mode = WAL");
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return db;
}
