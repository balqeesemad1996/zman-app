import { Router } from "express";
import { db } from "@workspace/db";
import { purchases, expenses, sales, orders } from "@workspace/db/schema";
import { eq, isNull, and, like, or, gte, lte, desc } from "drizzle-orm";

const router = Router();

// ── Purchases ────────────────────────────────────────────────

router.get("/purchases", async (req, res) => {
  const { cursor, limit = "20", startDate, endDate, search, supplier } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit) || 20, 100);

  const conditions = [isNull(purchases.deletedAt)];
  if (startDate) conditions.push(gte(purchases.date, startDate));
  if (endDate) conditions.push(lte(purchases.date, endDate));
  if (supplier) conditions.push(eq(purchases.supplier, supplier));
  if (search) {
    const p = `%${search}%`;
    conditions.push(or(like(purchases.item, p), like(purchases.supplier, p))!);
  }

  let rows = await db
    .select()
    .from(purchases)
    .where(and(...conditions))
    .orderBy(desc(purchases.createdAt));

  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    if (idx !== -1) rows = rows.slice(idx + 1);
  }

  const hasNextPage = rows.length > lim;
  const page = hasNextPage ? rows.slice(0, lim) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : undefined;
  res.json({ items: page, nextCursor });
});

router.get("/purchases/suppliers", async (_req, res) => {
  const rows = await db
    .select({ supplier: purchases.supplier })
    .from(purchases)
    .where(isNull(purchases.deletedAt));
  const unique = [...new Set(rows.map((r) => r.supplier).filter(Boolean))];
  res.json(unique);
});

router.get("/purchases/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.id, req.params.id!), isNull(purchases.deletedAt)));
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json(row);
});

router.post("/purchases", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const ts = new Date().toISOString();
  const qty = Number(d.quantity || 1);
  const unit = Number(d.unitCostCents || 0);
  const [row] = await db.insert(purchases).values({
    id: crypto.randomUUID(),
    date: String(d.date || ""),
    item: String(d.item || ""),
    supplier: String(d.supplier || ""),
    quantity: qty,
    unitCostCents: unit,
    totalCents: qty * unit,
    notes: String(d.notes || ""),
    createdAt: ts,
    updatedAt: ts,
  }).returning();
  res.status(201).json({ status: "ok", data: row });
});

router.patch("/purchases/:id", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (d.date !== undefined) updates.date = String(d.date);
  if (d.item !== undefined) updates.item = String(d.item);
  if (d.supplier !== undefined) updates.supplier = String(d.supplier);
  if (d.quantity !== undefined) updates.quantity = Number(d.quantity);
  if (d.unitCostCents !== undefined) updates.unitCostCents = Number(d.unitCostCents);
  if (d.notes !== undefined) updates.notes = String(d.notes);
  if (d.quantity !== undefined || d.unitCostCents !== undefined) {
    const qty = Number(d.quantity ?? 1);
    const unit = Number(d.unitCostCents ?? 0);
    updates.totalCents = qty * unit;
  }
  const [row] = await db.update(purchases).set(updates)
    .where(and(eq(purchases.id, req.params.id!), isNull(purchases.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: row });
});

router.delete("/purchases/:id", async (req, res) => {
  const [row] = await db.update(purchases)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(purchases.id, req.params.id!), isNull(purchases.deletedAt))).returning({ id: purchases.id });
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: null });
});

// ── Expenses ────────────────────────────────────────────────

router.get("/expenses", async (req, res) => {
  const { cursor, limit = "20", startDate, endDate, search, category } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit) || 20, 100);

  const conditions = [isNull(expenses.deletedAt)];
  if (startDate) conditions.push(gte(expenses.date, startDate));
  if (endDate) conditions.push(lte(expenses.date, endDate));
  if (category && category !== "all") conditions.push(eq(expenses.category, category));
  if (search) {
    const p = `%${search}%`;
    conditions.push(or(like(expenses.category, p), like(expenses.description, p))!);
  }

  let rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.createdAt));

  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    if (idx !== -1) rows = rows.slice(idx + 1);
  }

  const hasNextPage = rows.length > lim;
  const page = hasNextPage ? rows.slice(0, lim) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : undefined;
  res.json({ items: page, nextCursor });
});

router.get("/expenses/categories", async (_req, res) => {
  const rows = await db
    .select({ category: expenses.category })
    .from(expenses)
    .where(isNull(expenses.deletedAt));
  const unique = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  res.json(unique);
});

router.get("/expenses/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, req.params.id!), isNull(expenses.deletedAt)));
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json(row);
});

router.post("/expenses", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const ts = new Date().toISOString();
  const [row] = await db.insert(expenses).values({
    id: crypto.randomUUID(),
    date: String(d.date || ""),
    category: String(d.category || ""),
    amountCents: Number(d.amountCents || 0),
    description: String(d.description || ""),
    createdAt: ts,
    updatedAt: ts,
  }).returning();
  res.status(201).json({ status: "ok", data: row });
});

router.patch("/expenses/:id", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (d.date !== undefined) updates.date = String(d.date);
  if (d.category !== undefined) updates.category = String(d.category);
  if (d.amountCents !== undefined) updates.amountCents = Number(d.amountCents);
  if (d.description !== undefined) updates.description = String(d.description);
  const [row] = await db.update(expenses).set(updates)
    .where(and(eq(expenses.id, req.params.id!), isNull(expenses.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: row });
});

router.delete("/expenses/:id", async (req, res) => {
  const [row] = await db.update(expenses)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(expenses.id, req.params.id!), isNull(expenses.deletedAt))).returning({ id: expenses.id });
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: null });
});

// ── Sales ────────────────────────────────────────────────────

router.get("/sales", async (req, res) => {
  const { cursor, limit = "20", startDate, endDate, search, source } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit) || 20, 100);

  const conditions = [isNull(sales.deletedAt)];
  if (startDate) conditions.push(gte(sales.date, startDate));
  if (endDate) conditions.push(lte(sales.date, endDate));
  if (source && source !== "all") conditions.push(eq(sales.source, source));
  if (search) {
    conditions.push(like(sales.description, `%${search}%`));
  }

  let rows = await db
    .select()
    .from(sales)
    .where(and(...conditions))
    .orderBy(desc(sales.createdAt));

  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    if (idx !== -1) rows = rows.slice(idx + 1);
  }

  const hasNextPage = rows.length > lim;
  const page = hasNextPage ? rows.slice(0, lim) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : undefined;
  res.json({ items: page, nextCursor });
});

router.get("/sales/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, req.params.id!), isNull(sales.deletedAt)));
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json(row);
});

router.post("/sales", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const ts = new Date().toISOString();
  const [row] = await db.insert(sales).values({
    id: crypto.randomUUID(),
    date: String(d.date || ""),
    source: String(d.source || "manual"),
    orderId: d.orderId ? String(d.orderId) : null,
    description: String(d.description || ""),
    amountCents: Number(d.amountCents || 0),
    createdAt: ts,
    updatedAt: ts,
  }).returning();
  res.status(201).json({ status: "ok", data: row });
});

router.patch("/sales/:id", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (d.date !== undefined) updates.date = String(d.date);
  if (d.source !== undefined) updates.source = String(d.source);
  if (d.orderId !== undefined) updates.orderId = d.orderId ? String(d.orderId) : null;
  if (d.description !== undefined) updates.description = String(d.description);
  if (d.amountCents !== undefined) updates.amountCents = Number(d.amountCents);
  const [row] = await db.update(sales).set(updates)
    .where(and(eq(sales.id, req.params.id!), isNull(sales.deletedAt))).returning();
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: row });
});

router.delete("/sales/:id", async (req, res) => {
  const [row] = await db.update(sales)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(sales.id, req.params.id!), isNull(sales.deletedAt))).returning({ id: sales.id });
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: null });
});

// POST /api/sales/convert-order  — convert delivered order to sale
router.post("/sales/convert-order", async (req, res) => {
  const { orderId } = req.body as { orderId: string };
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), isNull(orders.deletedAt)));
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

  const ts = new Date().toISOString();
  const [sale] = await db.insert(sales).values({
    id: crypto.randomUUID(),
    date: ts.split("T")[0]!,
    source: "order",
    orderId,
    description: `مبيعات من طلب: ${order.customerName} - ${order.productName}`,
    amountCents: order.totalPriceCents,
    createdAt: ts,
    updatedAt: ts,
  }).returning();
  return res.status(201).json({ status: "ok", data: sale });
});

export default router;
