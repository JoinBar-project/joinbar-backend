CREATE TABLE IF NOT EXISTS "events" (
"id" bigint PRIMARY KEY NOT NULL,
"name" varchar(50) NOT NULL,
"bar_name" varchar(100) NOT NULL,
"location" varchar(100) NOT NULL,
"start_date" timestamp NOT NULL,
"end_date" timestamp NOT NULL,
"max_people" integer,
"image_url" varchar(255),
"price" integer,
"host_user" integer NOT NULL,
"created_at" timestamp NOT NULL,
"modify_at" timestamp NOT NULL,
"status" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
"id" serial PRIMARY KEY NOT NULL,
"name" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_tags" (
"event_id" bigint NOT NULL,
"tag_id" integer NOT NULL,
CONSTRAINT "event_tags_event_id_tag_id_pk" PRIMARY KEY("event_id","tag_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_host_user" ON "events" USING btree ("host_user");
