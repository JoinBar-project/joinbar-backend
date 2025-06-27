ALTER TABLE "bars" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bars" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bars" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_bar_folders" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_bar_folders" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_bar_folders" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bars" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "bars" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "bars" ADD COLUMN "updated_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "bars" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "bars" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "bars" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "bars" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "bars" DROP COLUMN "open_hours";