CREATE TABLE "bar_tags" (
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
CREATE TABLE "user_tags" (
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
ALTER TABLE "bar_tags" ADD CONSTRAINT "bar_tags_bar_id_bars_id_fk" FOREIGN KEY ("bar_id") REFERENCES "public"."bars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verification_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verification_expires";