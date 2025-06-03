CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"nickname" varchar(100),
	"email" varchar(100),
	"password" varchar(100),
	"role" varchar(20) DEFAULT 'user',
	"birthday" date,
	"is_verified_email" boolean DEFAULT false,
	"provider_type" varchar(20),
	"provider_id" varchar(100),
	"avatar_url" varchar(255),
	"avatar_key" varchar(255),
	"avatar_last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bars" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" varchar(255),
	"phone" varchar(20),
	"description" text,
	"rating" numeric(3, 1),
	"open_hours" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_bar_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"folder_name" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_bar_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"bar_id" integer,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_bar_collection_user_id_bar_id_unique" UNIQUE("user_id","bar_id")
);
--> statement-breakpoint
CREATE TABLE "user_event_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" bigint,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_event_collection_user_id_event_id_unique" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_event_participation" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" bigint,
	"joined_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_event_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"folder_name" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_folders" ADD CONSTRAINT "user_bar_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ADD CONSTRAINT "user_bar_collection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ADD CONSTRAINT "user_bar_collection_bar_id_bars_id_fk" FOREIGN KEY ("bar_id") REFERENCES "public"."bars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ADD CONSTRAINT "user_bar_collection_folder_id_user_bar_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."user_bar_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_collection" ADD CONSTRAINT "user_event_collection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_collection" ADD CONSTRAINT "user_event_collection_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_collection" ADD CONSTRAINT "user_event_collection_folder_id_user_event_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."user_event_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_participation" ADD CONSTRAINT "user_event_participation_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_participation" ADD CONSTRAINT "user_event_participation_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_folders" ADD CONSTRAINT "user_event_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;