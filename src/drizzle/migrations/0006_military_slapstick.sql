CREATE TABLE IF NOT EXISTS "bar_tags" (
	"bar_id" integer PRIMARY KEY NOT NULL,
	"sport" boolean NOT NULL,
	"music" boolean NOT NULL,
	"student" boolean NOT NULL,
	"bistro" boolean NOT NULL,
	"drink" boolean NOT NULL,
	"joy" boolean NOT NULL,
	"romantic" boolean NOT NULL,
	"oldschool" boolean NOT NULL,
	"highlevel" boolean NOT NULL,
	"easy" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_tags" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"sport" boolean NOT NULL,
	"music" boolean NOT NULL,
	"student" boolean NOT NULL,
	"bistro" boolean NOT NULL,
	"drink" boolean NOT NULL,
	"joy" boolean NOT NULL,
	"romantic" boolean NOT NULL,
	"oldschool" boolean NOT NULL,
	"highlevel" boolean NOT NULL,
	"easy" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verification_token";--> statement-breakpoint
