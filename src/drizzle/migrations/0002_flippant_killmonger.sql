ALTER TABLE "bars" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_user_id') THEN
        ALTER TABLE "users" ADD COLUMN "line_user_id" varchar(255);
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_display_name') THEN
        ALTER TABLE "users" ADD COLUMN "line_display_name" varchar(255);
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_picture_url') THEN
        ALTER TABLE "users" ADD COLUMN "line_picture_url" text;
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_status_message') THEN
        ALTER TABLE "users" ADD COLUMN "line_status_message" text;
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_line_user') THEN
        ALTER TABLE "users" ADD COLUMN "is_line_user" boolean DEFAULT false;
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bars' AND column_name = 'tags') THEN
        ALTER TABLE "bars" ADD COLUMN "tags" varchar(20);
    END IF;
END $$;
