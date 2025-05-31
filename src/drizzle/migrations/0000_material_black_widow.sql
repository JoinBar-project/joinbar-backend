CREATE TABLE "events" (
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
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "event_tags" (
	"event_id" bigint NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "event_tags_event_id_tag_id_pk" PRIMARY KEY("event_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_host_user" ON "events" USING btree ("host_user");