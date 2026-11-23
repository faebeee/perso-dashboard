import "@tanstack/react-start/server-only";
import { z } from "zod";

const envSchema = z.object({
	APP_URL: z.url().default("http://127.0.0.1:3100"),
	ENCRYPTION_KEY: z
		.string({ error: "ENCRYPTION_KEY is required (openssl rand -base64 32)" })
		.refine((v) => Buffer.from(v, "base64").length === 32, {
			message: "ENCRYPTION_KEY must be 32 bytes, base64 encoded",
		}),
	DATABASE_PATH: z.string().default("./data/dashboard.db"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

function loadDotEnvOnce() {
	try {
		// Native since Node 20.12; never overrides variables already set.
		process.loadEnvFile(".env");
	} catch {
		// no .env file: rely on the real environment
	}
}

export function getEnv(): Env {
	if (cached) return cached;
	loadDotEnvOnce();
	const parsed = envSchema.safeParse(process.env);
	if (!parsed.success) {
		throw new Error(
			`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`,
		);
	}
	cached = parsed.data;
	return cached;
}

export interface OAuthClientCredentials {
	clientId: string;
	clientSecret: string;
}

/**
 * Reads `${PREFIX}_CLIENT_ID` / `${PREFIX}_CLIENT_SECRET`. Returns null when
 * either is missing so integrations can report themselves as unconfigured
 * instead of crashing the app.
 */
export function readOAuthClient(prefix: string): OAuthClientCredentials | null {
	loadDotEnvOnce();
	const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
	const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export function requireOAuthClient(prefix: string): OAuthClientCredentials {
	const creds = readOAuthClient(prefix);
	if (!creds) {
		throw new Error(
			`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must be set to use this integration`,
		);
	}
	return creds;
}
