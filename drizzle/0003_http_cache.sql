CREATE TABLE `http_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`body` text NOT NULL,
	`etag` text,
	`last_modified` text,
	`fetched_at` integer NOT NULL
);
