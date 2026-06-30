CREATE TABLE "expense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"category" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_category_length" CHECK (char_length("expense"."category") <= 200),
	CONSTRAINT "expense_amount_nonnegative" CHECK ("expense"."amount_cents" >= 0),
	CONSTRAINT "expense_description_length" CHECK (char_length("expense"."description") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"item" text NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"total_cents" integer GENERATED ALWAYS AS (quantity * unit_cost_cents) STORED NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_item_length" CHECK (char_length("purchase"."item") <= 200),
	CONSTRAINT "purchase_supplier_length" CHECK (char_length("purchase"."supplier") <= 200),
	CONSTRAINT "purchase_quantity_positive" CHECK ("purchase"."quantity" > 0),
	CONSTRAINT "purchase_unit_cost_nonnegative" CHECK ("purchase"."unit_cost_cents" >= 0),
	CONSTRAINT "purchase_notes_length" CHECK (char_length("purchase"."notes") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "sale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"source" text NOT NULL,
	"order_id" uuid,
	"amount_cents" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_source_length" CHECK (char_length("sale"."source") <= 32),
	CONSTRAINT "sale_source_enum" CHECK ("sale"."source" in ('manual','order')),
	CONSTRAINT "sale_amount_nonnegative" CHECK ("sale"."amount_cents" >= 0),
	CONSTRAINT "sale_description_length" CHECK (char_length("sale"."description") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_date_idx" ON "expense" USING btree ("date" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "expense_category_idx" ON "expense" USING btree ("category") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "purchase_date_idx" ON "purchase" USING btree ("date" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sale_order_id_unique_idx" ON "sale" USING btree ("order_id") WHERE order_id is not null and deleted_at is null;--> statement-breakpoint
CREATE INDEX "sale_date_idx" ON "sale" USING btree ("date" DESC NULLS LAST) WHERE deleted_at is null;
--> statement-breakpoint
CREATE TRIGGER purchase_set_updated_at
  BEFORE UPDATE ON "purchase"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER expense_set_updated_at
  BEFORE UPDATE ON "expense"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER sale_set_updated_at
  BEFORE UPDATE ON "sale"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();