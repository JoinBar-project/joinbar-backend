CREATE TABLE IF NOT EXISTS "users" (
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
CREATE TABLE IF NOT EXISTS "user_notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bars" (
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
CREATE TABLE IF NOT EXISTS "user_bar_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"folder_name" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_bar_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"bar_id" integer,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_bar_collection_user_id_bar_id_unique" UNIQUE("user_id","bar_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_event_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" bigint,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_event_collection_user_id_event_id_unique" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_event_participation" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" bigint,
	"joined_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_event_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"folder_name" varchar(50),
	"created_at" timestamp DEFAULT now()
);
