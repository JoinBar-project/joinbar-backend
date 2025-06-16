ALTER TABLE "benefitRedeems" ADD COLUMN "start_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "benefitRedeems" ADD COLUMN "end_at" timestamp with time zone NOT NULL;