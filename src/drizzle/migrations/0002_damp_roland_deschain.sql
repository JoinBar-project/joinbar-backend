ALTER TABLE "bars" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "bars" ADD COLUMN "tags" varchar(20);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_user_users_id_fk" FOREIGN KEY ("host_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_folders" ADD CONSTRAINT "user_bar_folders_user_id_folder_name_unique" UNIQUE("user_id","folder_name");--> statement-breakpoint
ALTER TABLE "user_event_participation" ADD CONSTRAINT "user_event_participation_user_id_event_id_unique" UNIQUE("user_id","event_id");--> statement-breakpoint
ALTER TABLE "user_event_folders" ADD CONSTRAINT "user_event_folders_user_id_folder_name_unique" UNIQUE("user_id","folder_name");