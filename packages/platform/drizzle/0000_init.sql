CREATE TABLE `connections` (
	`integration_id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`scopes` text NOT NULL,
	`account_label` text,
	`meta` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dashboard_layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`items` text NOT NULL,
	`updated_at` integer NOT NULL
);
