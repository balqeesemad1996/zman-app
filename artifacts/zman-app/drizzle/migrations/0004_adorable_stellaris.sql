CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"opening_balance_cents" integer NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_name_length" CHECK (char_length("account"."name") <= 200),
	CONSTRAINT "account_type_enum" CHECK ("account"."type" in ('cash', 'bank')),
	CONSTRAINT "account_opening_balance_nonnegative" CHECK ("account"."opening_balance_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cash_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"description" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movement_direction_enum" CHECK ("cash_movement"."direction" in ('in', 'out')),
	CONSTRAINT "cash_movement_amount_positive" CHECK ("cash_movement"."amount_cents" > 0),
	CONSTRAINT "cash_movement_source_type_enum" CHECK ("cash_movement"."source_type" in ('sale', 'expense', 'purchase', 'deposit', 'owner_draw', 'owner_inject', 'opening', 'transfer')),
	CONSTRAINT "cash_movement_description_length" CHECK (char_length("cash_movement"."description") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "expense_category_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_category_catalog_name_length" CHECK (char_length("expense_category_catalog"."name") <= 200)
);
--> statement-breakpoint
CREATE TABLE "opening_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"go_live_date" date NOT NULL,
	"cash_cents" integer NOT NULL,
	"bank_cents" integer NOT NULL,
	"capital_cents" integer NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opening_balance_cash_nonnegative" CHECK ("opening_balance"."cash_cents" >= 0),
	CONSTRAINT "opening_balance_bank_nonnegative" CHECK ("opening_balance"."bank_cents" >= 0),
	CONSTRAINT "opening_balance_capital_nonnegative" CHECK ("opening_balance"."capital_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "owner_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_transaction_type_enum" CHECK ("owner_transaction"."type" in ('draw', 'inject')),
	CONSTRAINT "owner_transaction_amount_positive" CHECK ("owner_transaction"."amount_cents" > 0),
	CONSTRAINT "owner_transaction_reason_length" CHECK (char_length("owner_transaction"."reason") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "purchase_item_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_item_catalog_name_length" CHECK (char_length("purchase_item_catalog"."name") <= 200)
);
--> statement-breakpoint
CREATE TABLE "message_template" (
	"key" text PRIMARY KEY NOT NULL,
	"template" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_length" CHECK (char_length("message_template"."template") <= 5000)
);
--> statement-breakpoint
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
ALTER TABLE "order" ADD COLUMN "customer_phone_alt" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "additional_costs_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "delivery_date" date;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "received_date" date DEFAULT CURRENT_DATE NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "deposit_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "deposit_date" date;--> statement-breakpoint
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_transaction" ADD CONSTRAINT "owner_transaction_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_type_idx" ON "account" USING btree ("type") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "cash_movement_account_date_idx" ON "cash_movement" USING btree ("account_id","date" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "cash_movement_source_idx" ON "cash_movement" USING btree ("source_type","source_id") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "expense_category_catalog_name_idx" ON "expense_category_catalog" USING btree ("name") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "owner_transaction_date_idx" ON "owner_transaction" USING btree ("date" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "purchase_item_catalog_name_idx" ON "purchase_item_catalog" USING btree ("name") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "catalog_name_idx" ON "catalog_component" USING btree ("name") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "snippet_category_idx" ON "snippet" USING btree ("category") WHERE deleted_at is null;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "customer_phone_alt_length" CHECK (char_length("order"."customer_phone_alt") <= 32);--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "additional_costs_nonneg" CHECK ("order"."additional_costs_cents" >= 0);--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_deposit_nonnegative" CHECK ("order"."deposit_cents" >= 0);