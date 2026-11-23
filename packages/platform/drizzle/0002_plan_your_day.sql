CREATE TABLE `item_dismissals` (
	`item_id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`until` integer,
	`fingerprint` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `today_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`source` text,
	`item_kind` text,
	`item_id` text,
	`url` text,
	`detail_ref` text,
	`done` integer DEFAULT false NOT NULL,
	`done_at` integer,
	`created_at` integer NOT NULL
);
