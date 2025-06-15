CREATE TABLE "orders" (
	"id" bigint PRIMARY KEY NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"user_id" integer,
	"total_amount" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(20),
	"payment_id" varchar(255),
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" varchar(255),
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
CREATE TABLE "subs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sub_type" varchar(100) NOT NULL,
	"price" integer,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"create_at" timestamp with time zone NOT NULL,
	"modify_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" RENAME COLUMN "start_date" TO "end_at";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "start_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "creat_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subs" ADD CONSTRAINT "subs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user" ON "subs" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "created_at";