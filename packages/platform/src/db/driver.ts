/**
 * The minimal SQL surface the app needs. Implemented by the Tauri SQL plugin
 * in the app and by `node:sqlite` in tests.
 */
export interface SqlDriver {
	execute(sql: string, params: unknown[]): Promise<void>;
	/** Rows as arrays of column values, in SELECT column order. */
	select(sql: string, params: unknown[]): Promise<unknown[][]>;
}
