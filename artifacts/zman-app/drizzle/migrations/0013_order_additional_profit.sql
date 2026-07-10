-- ============================================================================
-- migration 0013 — عمود "الأرباح الإضافية" + إلغاء عمود تكلفة التوصيل غير المستخدم
-- ============================================================================
-- (أ) additional_profit_cents: ربح جانبي يُضاف إلى صافي ربح الطلب (مرة واحدة،
--     لا يُضرب في الكمية). منفصل عن total_cost_cents لأنه ربح لا تكلفة.
--     صافي الربح المرجعي = totalPriceCents − totalCostCents + additionalProfitCents.
-- (ب) حذف delivery_cost_cents: صار التوصيل رقماً واحداً مسجّلاً للتوثيق فقط
--     (delivery_paid_cents). أي ربح من فرق التوصيل يُسجَّل يدوياً ضمن
--     additional_profit_cents. العمود المحذوف كان فارغاً (nullable، بلا بيانات).
-- ============================================================================

-- (أ) عمود الأرباح الإضافية
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "additional_profit_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_additional_profit_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT "order_additional_profit_nonneg" CHECK ("additional_profit_cents" >= 0);
  END IF;
END $$;
--> statement-breakpoint

-- (ب) إلغاء قيد وعمود تكلفة التوصيل غير المستخدمين (آمن — العمود فارغ)
ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "order_delivery_cost_nonneg";
--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN IF EXISTS "delivery_cost_cents";
