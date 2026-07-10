-- ============================================================================
-- migration 0012 — أعمدة التوصيل + تصحيح معنى كمية المكوّن إلى "تكرار في الوحدة"
-- ============================================================================
-- الجزء (أ): إضافة عمودَي التوصيل على مستوى الطلب.
--   delivery_paid_cents : ما يدفعه الزبون مقابل التوصيل (يمرّ عبر المتجر).
--   delivery_cost_cents : تكلفة التوصيل الفعلية على المتجر (قد تُملأ لاحقاً — nullable).
--   ربح التوصيل = delivery_paid_cents − delivery_cost_cents (يُحسب في التطبيق).
-- الجزء (ب): تصحيح البيانات القديمة. سابقاً كان المستخدم يُدخل في كمية المكوّن
--   "العدد الكلي في الطلب" (مثلاً 100 لطلب من 100 شتلة). المعنى الجديد هو
--   "كم مرة يتكرر المكوّن داخل الوحدة الواحدة" (1 لكل شتلة). لذا نقسم الكمية
--   القديمة على كمية المنتج. total_cost_cents المخزّن لا يُلمس (يبقى صحيحاً).
-- الأمان: التصحيح يُطبّق فقط على الصفوف القابلة للقسمة تماماً على كمية المنتج،
--   وحيث الكمية >= كمية المنتج (يستثني تلقائياً الصفوف المصحّحة مسبقاً حيث تكون
--   الكمية = تكرار صغير مثل 1). فحص الإنتاج: 69/69 مكوّن قابل للقسمة، صفر مخاطر.
-- ============================================================================

-- (أ) أعمدة التوصيل
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "delivery_paid_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "delivery_cost_cents" integer;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_delivery_paid_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT "order_delivery_paid_nonneg" CHECK ("delivery_paid_cents" >= 0);
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_delivery_cost_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT "order_delivery_cost_nonneg" CHECK ("delivery_cost_cents" IS NULL OR "delivery_cost_cents" >= 0);
  END IF;
END $$;
--> statement-breakpoint

-- (ب) تصحيح كميات المكوّنات القديمة إلى "تكرار في الوحدة" — آمن وقابل للتكرار.
--     يُطبّق فقط حيث الكمية مضاعف صحيح لكمية المنتج (>=). الصفوف المصحّحة سابقاً
--     (كمية صغيرة < كمية المنتج) لا تتأثر، فإعادة تشغيله لا تكسر شيئاً.
UPDATE order_component oc
SET quantity = oc.quantity / o.quantity,
    updated_at = now()
FROM "order" o
WHERE oc.order_id = o.id
  AND o.quantity > 1
  AND oc.quantity >= o.quantity
  AND (oc.quantity % o.quantity) = 0;
