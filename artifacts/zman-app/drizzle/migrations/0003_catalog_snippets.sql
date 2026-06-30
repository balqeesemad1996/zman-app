CREATE TABLE "catalog_component" (
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"default_cost_cents" integer DEFAULT 0 NOT NULL,
"unit" text DEFAULT 'قطعة' NOT NULL,
"notes" text DEFAULT '' NOT NULL,
"deleted_at" timestamp with time zone,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "catalog_name_length" CHECK (char_length("catalog_component"."name") <= 200),
CONSTRAINT "catalog_cost_nonnegative" CHECK ("catalog_component"."default_cost_cents" >= 0),
CONSTRAINT "catalog_unit_length" CHECK (char_length("catalog_component"."unit") <= 32),
CONSTRAINT "catalog_notes_length" CHECK (char_length("catalog_component"."notes") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "snippet" (
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"title" text NOT NULL,
"body" text NOT NULL,
"category" text DEFAULT 'عام' NOT NULL,
"deleted_at" timestamp with time zone,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "snippet_title_length" CHECK (char_length("snippet"."title") <= 200),
CONSTRAINT "snippet_body_length" CHECK (char_length("snippet"."body") <= 5000),
CONSTRAINT "snippet_category_length" CHECK (char_length("snippet"."category") <= 64)
);
--> statement-breakpoint
CREATE INDEX "catalog_name_idx" ON "catalog_component" USING btree ("name") WHERE deleted_at is null;
--> statement-breakpoint
CREATE INDEX "snippet_category_idx" ON "snippet" USING btree ("category") WHERE deleted_at is null;
--> statement-breakpoint
CREATE TRIGGER catalog_component_set_updated_at
  BEFORE UPDATE ON "catalog_component"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER snippet_set_updated_at
  BEFORE UPDATE ON "snippet"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
