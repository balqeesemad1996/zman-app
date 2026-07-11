-- ============================================================================
-- migration 0015 — Backfill remainder cash_movement with additionalProfit
-- ============================================================================
-- يعالج فجوة في migration 0014 part (d): ذلك الجزء رفع sale.amount_cents
-- بمقدار additional_profit_cents لكنه لم يرفع حركة المتبقي في cash_movement.
-- النتيجة: sum(sale movements) = totalPrice بينما sale.amountCents = totalPrice
-- + additionalProfit، مما يُفشل IC-4 و IC-8 للطلبات التاريخية ذات الأرباح
-- الإضافية. هذه الترحيلة تُضيف additional_profit_cents إلى حركة المتبقي فقط
-- (وليس حركة العربون المحوَّلة) لتستعيد الاتساق.
-- آمن للتشغيل المتكرر (idempotent): الشرط الأخير cm.amount_cents =
-- o.total_price_cents - o.deposit_cents يضمن أن الترحيلة لا تُطبَّق مرتين.
-- ============================================================================

UPDATE cash_movement cm
SET
  amount_cents = cm.amount_cents + COALESCE(o.additional_profit_cents, 0),
  updated_at = now()
FROM sale s
JOIN "order" o ON s.order_id = o.id
WHERE cm.source_type = 'sale'
  AND cm.source_id = s.id
  AND cm.direction = 'in'
  AND cm.deleted_at IS NULL
  AND cm.description NOT LIKE '%محوَّل من عربون%'
  AND s.source = 'order'
  AND s.deleted_at IS NULL
  AND o.status = 'delivered'
  AND o.deleted_at IS NULL
  AND COALESCE(o.additional_profit_cents, 0) > 0
  AND cm.amount_cents = o.total_price_cents - o.deposit_cents;
