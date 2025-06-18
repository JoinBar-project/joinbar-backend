CREATE TABLE IF NOT EXISTS "orders" (
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
CREATE TABLE IF NOT EXISTS "order_items" (
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
ALTER TABLE "messages" ALTER COLUMN "id" SET DATA TYPE bigint;
