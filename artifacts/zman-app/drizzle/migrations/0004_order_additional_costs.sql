-- إضافة عمود التكاليف العملية الإضافية لجدول الطلبات (ميزة additionalCostsCents)
-- آمن وقابل للتكرار: IF NOT EXISTS يتجاوز القواعد التي طُبّق عليها العمود يدوياً بالفعل.
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "additional_costs_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'additional_costs_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT "additional_costs_nonneg" CHECK ("order"."additional_costs_cents" >= 0);
  END IF;
END $$;
