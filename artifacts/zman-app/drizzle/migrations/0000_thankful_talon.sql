CREATE TABLE "idempotency_key" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_length" CHECK (char_length("idempotency_key"."action") <= 32)
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_cost_cents" integer DEFAULT 0 NOT NULL,
	"total_price_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_name_length" CHECK (char_length("order"."customer_name") <= 200),
	CONSTRAINT "customer_phone_length" CHECK (char_length("order"."customer_phone") <= 32),
	CONSTRAINT "product_name_length" CHECK (char_length("order"."product_name") <= 200),
	CONSTRAINT "quantity_positive" CHECK ("order"."quantity" > 0),
	CONSTRAINT "total_cost_nonnegative" CHECK ("order"."total_cost_cents" >= 0),
	CONSTRAINT "total_price_nonnegative" CHECK ("order"."total_price_cents" >= 0),
	CONSTRAINT "status_enum" CHECK ("order"."status" in ('draft','sent','confirmed','delivered','cancelled')),
	CONSTRAINT "status_length" CHECK (char_length("order"."status") <= 32),
	CONSTRAINT "notes_length" CHECK (char_length("order"."notes") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "order_component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cost_cents" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "name_length" CHECK (char_length("order_component"."name") <= 200),
	CONSTRAINT "cost_cents_nonnegative" CHECK ("order_component"."cost_cents" >= 0),
	CONSTRAINT "quantity_positive" CHECK ("order_component"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_component" ADD CONSTRAINT "order_component_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status","created_at" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "order_created_at_idx" ON "order" USING btree ("created_at" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "order_component_order_idx" ON "order_component" USING btree ("order_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER order_set_updated_at
  BEFORE UPDATE ON "order"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER order_component_set_updated_at
  BEFORE UPDATE ON order_component
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();