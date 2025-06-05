CREATE TABLE "bar_tags" (
	"bar_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "bar_tags_bar_id_tag_id_pk" PRIMARY KEY("bar_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "bar_tags" ADD CONSTRAINT "bar_tags_bar_id_bars_id_fk" FOREIGN KEY ("bar_id") REFERENCES "public"."bars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bar_tags" ADD CONSTRAINT "bar_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;