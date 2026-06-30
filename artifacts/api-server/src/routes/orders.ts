import { Router } from "express";
import { db } from "@workspace/db";
import { orders, orderComponents } from "@workspace/db/schema";
import { eq, isNull, and, like, or, lt, gte, lte, desc } from "drizzle-orm";

const router = Router();

function computeTotalCost(
  components: { quantity: number; unitCostCents: number }[],
  overheadCostCents: number,
): number {
  const compSum = components.reduce(
    (s, c) => s + Number(c.unitCostCents) * Number(c.quantity),
    0,
  );
  return compSum + Number(overheadCostCents || 0);
}

// GET /api/orders
router.get("/orders", async (req, res) => {
  const { status, q, cursor, limit = "20", from, to } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit) || 20, 200);

  const conditions = [isNull(orders.deletedAt)];
  if (status && status !== "all") {
    conditions.push(eq(orders.status, status));
  }
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(like(orders.customerName, pattern), like(orders.productName, pattern))!);
  }
  if (from) conditions.push(gte(orders.createdAt, from));
  if (to) conditions.push(lte(orders.createdAt, to));

  let rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));

  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    if (idx !== -1) rows = rows.slice(idx + 1);
  }

  const hasNextPage = rows.length > lim;
  const page = hasNextPage ? rows.slice(0, lim) : rows;
  const lastItem = page[page.length - 1];
  const nextCursor = hasNextPage && lastItem ? lastItem.id : undefined;

  res.json({ items: page, nextCursor });
});

// GET /api/orders/:id
router.get("/orders/:id", async (req, res) => {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, req.params.id!), isNull(orders.deletedAt)));
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

  const components = await db
    .select()
    .from(orderComponents)
    .where(eq(orderComponents.orderId, req.params.id!));

  return res.json({ ...order, components });
});

// POST /api/orders
router.post("/orders", async (req, res) => {
  const body = req.body as {
    customerName: string;
    customerPhone: string;
    productName: string;
    quantity: number;
    overheadCostCents: number;
    totalPriceCents: number;
    status: string;
    notes: string;
    components?: { name: string; quantity: number; unitCostCents: number }[];
  };

  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  const comps = body.components || [];
  const overheadCostCents = Number(body.overheadCostCents || 0);
  const totalCostCents = computeTotalCost(comps, overheadCostCents);

  const [order] = await db
    .insert(orders)
    .values({
      id,
      customerName: String(body.customerName || ""),
      customerPhone: String(body.customerPhone || ""),
      productName: String(body.productName || ""),
      quantity: Number(body.quantity || 1),
      totalCostCents,
      overheadCostCents,
      totalPriceCents: Number(body.totalPriceCents || 0),
      status: String(body.status || "draft"),
      notes: String(body.notes || ""),
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  if (comps.length) {
    await db.insert(orderComponents).values(
      comps.map((c) => ({
        id: crypto.randomUUID(),
        orderId: id,
        name: String(c.name),
        quantity: Number(c.quantity),
        unitCostCents: Number(c.unitCostCents),
      })),
    );
  }

  return res.status(201).json({ status: "ok", data: order });
});

// PATCH /api/orders/:id
router.patch("/orders/:id", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  const scalarFields = [
    "customerName", "customerPhone", "productName", "quantity",
    "totalPriceCents", "status", "notes", "overheadCostCents",
  ] as const;
  for (const f of scalarFields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (body.components !== undefined) {
    await db.delete(orderComponents).where(eq(orderComponents.orderId, req.params.id!));
    const comps = body.components as { name: string; quantity: number; unitCostCents: number }[];
    if (comps.length) {
      await db.insert(orderComponents).values(
        comps.map((c) => ({
          id: crypto.randomUUID(),
          orderId: req.params.id!,
          name: String(c.name),
          quantity: Number(c.quantity),
          unitCostCents: Number(c.unitCostCents),
        })),
      );
    }
    const overheadCostCents = Number(updates.overheadCostCents ?? body.overheadCostCents ?? 0);
    updates.totalCostCents = computeTotalCost(
      body.components as { quantity: number; unitCostCents: number }[],
      overheadCostCents,
    );
  }

  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(and(eq(orders.id, req.params.id!), isNull(orders.deletedAt)))
    .returning();

  if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });

  const components = await db
    .select()
    .from(orderComponents)
    .where(eq(orderComponents.orderId, req.params.id!));

  return res.json({ status: "ok", data: { ...updated, components } });
});

// DELETE /api/orders/:id  (soft delete)
router.delete("/orders/:id", async (req, res) => {
  const [updated] = await db
    .update(orders)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(orders.id, req.params.id!), isNull(orders.deletedAt)))
    .returning({ id: orders.id });

  if (!updated) return res.status(404).json({ error: "الطلب غير موجود" });
  return res.json({ status: "ok", data: null });
});

export default router;
