ALTER TABLE "bars" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "line_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "line_display_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "line_picture_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "line_status_message" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_line_user" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bars" ADD COLUMN "tags" varchar(20);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_user_users_id_fk" FOREIGN KEY ("host_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id");--> statement-breakpoint
ALTER TABLE "user_bar_folders" ADD CONSTRAINT "user_bar_folders_user_id_folder_name_unique" UNIQUE("user_id","folder_name");--> statement-breakpoint
ALTER TABLE "user_event_participation" ADD CONSTRAINT "user_event_participation_user_id_event_id_unique" UNIQUE("user_id","event_id");--> statement-breakpoint
ALTER TABLE "user_event_folders" ADD CONSTRAINT "user_event_folders_user_id_folder_name_unique" UNIQUE("user_id","folder_name");