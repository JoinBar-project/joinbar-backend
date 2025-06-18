ALTER TABLE "events" ALTER COLUMN "start_date" SET DATA TYPE timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "end_date" SET DATA TYPE timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;
