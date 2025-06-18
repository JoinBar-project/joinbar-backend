CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"nickname" varchar(100),
	"email" varchar(100),
	"password" varchar(100),
	"role" varchar(20) DEFAULT 'user',
	"birthday" date,
	"line_user_id" varchar(255),
	"line_display_name" varchar(255),
	"line_picture_url" text,
	"line_status_message" text,
	"is_line_user" boolean DEFAULT false,
	"is_verified_email" boolean DEFAULT false,
	"email_verification_token" varchar(255),
	"email_verification_expires" timestamp,
	"last_verification_email_sent" timestamp,
	"provider_type" varchar(20),
	"provider_id" varchar(100),
	"avatar_url" varchar(255),
	"avatar_key" varchar(255),
	"avatar_last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bars" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" varchar(255),
	"phone" varchar(20),
	"description" text,
	"tags" varchar(20),
	"rating" numeric(2, 1),
	"open_hours" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_bar_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"folder_name" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_bar_folders_user_id_folder_name_unique" UNIQUE("user_id","folder_name")
);
--> statement-breakpoint
CREATE TABLE "user_bar_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"bar_id" integer,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_bar_collection_user_id_bar_id_unique" UNIQUE("user_id","bar_id")
);
--> statement-breakpoint
CREATE TABLE "user_event_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" bigint,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_event_collection_user_id_event_id_unique" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_event_participation" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event_id" bigint,
	"joined_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_event_participation_user_id_event_id_unique" UNIQUE("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_event_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"folder_name" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_event_folders_user_id_folder_name_unique" UNIQUE("user_id","folder_name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"bar_name" varchar(100) NOT NULL,
	"location" varchar(100) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"max_people" integer,
	"image_url" varchar(255),
	"price" integer,
	"host_user" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"modify_at" timestamp with time zone NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "event_tags" (
	"event_id" bigint NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "event_tags_event_id_tag_id_pk" PRIMARY KEY("event_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigint PRIMARY KEY NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"user_id" integer,
	"total_amount" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(20),
	"payment_id" varchar(255),
	"transaction_id" varchar(255),
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" varchar(255),
	"refund_id" varchar(255),
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigint PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"event_id" bigint NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"bar_name" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"event_start_date" timestamp with time zone NOT NULL,
	"event_end_date" timestamp with time zone NOT NULL,
	"host_user_id" integer NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigint PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"user_id" integer NOT NULL,
	"event_id" bigint NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_folders" ADD CONSTRAINT "user_bar_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ADD CONSTRAINT "user_bar_collection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ADD CONSTRAINT "user_bar_collection_bar_id_bars_id_fk" FOREIGN KEY ("bar_id") REFERENCES "public"."bars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bar_collection" ADD CONSTRAINT "user_bar_collection_folder_id_user_bar_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."user_bar_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_collection" ADD CONSTRAINT "user_event_collection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_collection" ADD CONSTRAINT "user_event_collection_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_collection" ADD CONSTRAINT "user_event_collection_folder_id_user_event_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."user_event_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_participation" ADD CONSTRAINT "user_event_participation_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_participation" ADD CONSTRAINT "user_event_participation_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event_folders" ADD CONSTRAINT "user_event_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_user_users_id_fk" FOREIGN KEY ("host_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD CONSTRAINT "bar_tags_bar_id_bars_id_fk" FOREIGN KEY ("bar_id") REFERENCES "public"."bars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_host_user" ON "events" USING btree ("host_user");