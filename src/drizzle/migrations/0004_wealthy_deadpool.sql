CREATE TABLE "user_tags" (
	"user_id" integer NOT NULL,
	"sport" integer NOT NULL,
	"music" integer NOT NULL,
	"student" integer NOT NULL,
	"bistro" integer NOT NULL,
	"drink" integer NOT NULL,
	"joy" integer NOT NULL,
	"romantic" integer NOT NULL,
	"oldschool" integer NOT NULL,
	"highlevel" integer NOT NULL,
	"easy" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bar_tags" DROP CONSTRAINT "bar_tags_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "bar_tags" DROP CONSTRAINT "bar_tags_bar_id_tag_id_pk";--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "sport" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "music" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "student" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "bistro" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "drink" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "joy" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "romantic" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "oldschool" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "highlevel" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD COLUMN "easy" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bar_tags" DROP COLUMN "tag_id";