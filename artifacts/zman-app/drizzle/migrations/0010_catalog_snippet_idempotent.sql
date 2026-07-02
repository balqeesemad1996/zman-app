-- إنشاء جدولي catalog_component و snippet (idempotent) — كانا مفقودين من قاعدة الإنتاج
-- رغم وجود migration 0003 (لم يُطبَّق)، فأُنشئا يدوياً عبر SQL Editor. هذا يوثّقهما.
CREATE TABLE IF NOT EXISTS "catalog_component" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "default_cost_cents" integer DEFAULT 0 NOT NULL,
  "unit" text DEFAULT 'قطعة' NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_name_length" CHECK (char_length("name") <= 200),
  CONSTRAINT "catalog_cost_nonnegative" CHECK ("default_cost_cents" >= 0),
  CONSTRAINT "catalog_unit_length" CHECK (char_length("unit") <= 32),
  CONSTRAINT "catalog_notes_length" CHECK (char_length("notes") <= 1000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snippet" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "category" text DEFAULT 'عام' NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "snippet_title_length" CHECK (char_length("title") <= 200),
  CONSTRAINT "snippet_body_length" CHECK (char_length("body") <= 5000),
  CONSTRAINT "snippet_category_length" CHECK (char_length("category") <= 64)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_name_idx" ON "catalog_component" USING btree ("name") WHERE deleted_at is null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snippet_category_idx" ON "snippet" USING btree ("category") WHERE deleted_at is null;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='catalog_component_set_updated_at') THEN
    CREATE TRIGGER catalog_component_set_updated_at BEFORE UPDATE ON "catalog_component" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='snippet_set_updated_at') THEN
    CREATE TRIGGER snippet_set_updated_at BEFORE UPDATE ON "snippet" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
