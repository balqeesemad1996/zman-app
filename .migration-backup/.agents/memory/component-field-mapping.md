---
name: costCents vs unitCostCents field mapping
description: Form schema uses costCents for order components; DB/API type uses unitCostCents. Actions must map between them.
---

## Rule
The order component form schema (`orderComponentInputSchema`) uses `costCents`, but the DB/API type `OrderComponent` uses `unitCostCents`.

**Why:** The form was designed before the DB migration. The field name mismatch was kept to avoid touching the large ComponentsEditor component.

## How to apply
- In `orders/actions.ts` — the `mapComponents()` helper maps `costCents → unitCostCents` before sending to API.
- In `OrderForm.tsx` defaultValues (edit mode) — map `unitCostCents → costCents` when loading existing components.
- In `OrderDetail.tsx` — always use `c.unitCostCents` (DB type), not `c.costCents`.
- `watchedComponents` in `OrderForm.tsx` must be cast as `Array<{costCents?: number; quantity?: number}>` because `watch("components")` returns a mixed type.
