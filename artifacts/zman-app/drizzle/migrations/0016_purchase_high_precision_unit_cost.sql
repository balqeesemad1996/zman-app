-- ============================================================================
-- migration 0016 — سعر وحدة المشتريات عالي الدقّة (يمنع فقدان الكسور)
-- ============================================================================
-- المشكلة: total_cents كان عموداً مولّداً = quantity * unit_cost_cents، و
-- unit_cost_cents عدد صحيح (fils). فعند إدخال إجمالي لا يقبل القسمة على الكمية
-- (مثل 220 حبة بإجمالي 8000 fils)، يُقرّب سعر الوحدة (36.36→36) ويُضرب في الكمية،
-- فيعطي 7920 بدل 8000 — فرق يتسرّب إلى المالية.
--
-- الحل الجذري: عمود جديد unit_cost_micro_cents (ميلي-fils = fils×1000، 6 منازل
-- عشرية للدينار) هو المصدر الأساسي. total_cents يُعاد بناؤه = round(micro×qty/1000).
-- بذلك (فردي × كمية = إجمالي) يتحقّق دائماً دون فقدان الكسر.
--
-- آمن للتشغيل المتكرر (idempotent): كل خطوة محروسة بـ IF [NOT] EXISTS.
-- ============================================================================

-- 1. أضف عمود الفردي عالي الدقّة (يقبل NULL مؤقتاً للـ backfill)
ALTER TABLE purchase ADD COLUMN IF NOT EXISTS unit_cost_micro_cents bigint;

-- 2. Backfill من الفردي الصحيح القديم (fils → ميلي-fils). دقيق للبيانات الموجودة.
UPDATE purchase
SET unit_cost_micro_cents = unit_cost_cents::bigint * 1000
WHERE unit_cost_micro_cents IS NULL;

-- 3. NOT NULL + DEFAULT
ALTER TABLE purchase ALTER COLUMN unit_cost_micro_cents SET DEFAULT 0;
ALTER TABLE purchase ALTER COLUMN unit_cost_micro_cents SET NOT NULL;

-- 4. أعد بناء total_cents ليُحسب من الفردي عالي الدقّة (مقرّباً لأقرب fils).
--    نحذف العمود المولّد القديم ونعيده بالتعبير الجديد.
ALTER TABLE purchase DROP COLUMN IF EXISTS total_cents;
ALTER TABLE purchase ADD COLUMN total_cents integer
  GENERATED ALWAYS AS (round(unit_cost_micro_cents::numeric * quantity / 1000)::integer) STORED;

-- 5. تصحيح تاريخي: الصف 220×36=7920 كان المقصود منه إجمالي 8000 fils.
--    نعيد اشتقاق الفردي عالي الدقّة من الإجمالي المقصود، ونزامن حركة الصندوق.
DO $$
DECLARE
  v_id uuid;
  v_total integer;
BEGIN
  SELECT id INTO v_id FROM purchase
  WHERE quantity = 220 AND unit_cost_cents = 36 AND deleted_at IS NULL
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE purchase
    SET unit_cost_micro_cents = round(8000::numeric * 1000 / quantity),
        updated_at = now()
    WHERE id = v_id
    RETURNING total_cents INTO v_total;

    UPDATE cash_movement
    SET amount_cents = v_total, updated_at = now()
    WHERE source_type = 'purchase' AND source_id = v_id AND deleted_at IS NULL;
  END IF;
END $$;
