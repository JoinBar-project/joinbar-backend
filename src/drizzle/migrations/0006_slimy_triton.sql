CREATE TABLE "benefitRedeems" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sub_id" bigint NOT NULL,
	"benefit" varchar(255) NOT NULL,
	"redeem_at" timestamp with time zone,
	"create_at" timestamp with time zone NOT NULL,
	"status" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "benefitRedeems" ADD CONSTRAINT "benefitRedeems_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefitRedeems" ADD CONSTRAINT "benefitRedeems_sub_id_subs_id_fk" FOREIGN KEY ("sub_id") REFERENCES "public"."subs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sub" ON "benefitRedeems" USING btree ("sub_id");