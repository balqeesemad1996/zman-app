import { Router } from "express";
import { and, desc, eq, isNull, like } from "drizzle-orm";
import { db } from "@workspace/db";
import { catalogComponents } from "@workspace/db/schema";

const router = Router();

router.get("/catalog", async (req, res) => {
  const { cursor, limit = "50", search } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit) || 50, 200);

  const conditions = [isNull(catalogComponents.deletedAt)];
  if (search) {
    conditions.push(like(catalogComponents.name, `%${search}%`));
  }

  let rows = await db
    .select()
    .from(catalogComponents)
    .where(and(...conditions))
    .orderBy(desc(catalogComponents.createdAt));

  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    if (idx !== -1) rows = rows.slice(idx + 1);
  }

  const hasNextPage = rows.length > lim;
  const page = hasNextPage ? rows.slice(0, lim) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : undefined;
  res.json({ items: page, nextCursor });
});

router.get("/catalog/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(catalogComponents)
    .where(and(eq(catalogComponents.id, req.params.id!), isNull(catalogComponents.deletedAt)));
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json(row);
});

router.post("/catalog", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const ts = new Date().toISOString();
  const [row] = await db
    .insert(catalogComponents)
    .values({
      id: crypto.randomUUID(),
      name: String(d.name || ""),
      defaultCostCents: Number(d.defaultCostCents || 0),
      unit: String(d.unit || "قطعة"),
      notes: String(d.notes || ""),
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();
  res.status(201).json({ status: "ok", data: row });
});

router.patch("/catalog/:id", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (d.name !== undefined) updates.name = String(d.name);
  if (d.defaultCostCents !== undefined) updates.defaultCostCents = Number(d.defaultCostCents);
  if (d.unit !== undefined) updates.unit = String(d.unit);
  if (d.notes !== undefined) updates.notes = String(d.notes);

  const [row] = await db
    .update(catalogComponents)
    .set(updates)
    .where(and(eq(catalogComponents.id, req.params.id!), isNull(catalogComponents.deletedAt)))
    .returning();
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: row });
});

router.delete("/catalog/:id", async (req, res) => {
  const [row] = await db
    .update(catalogComponents)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(catalogComponents.id, req.params.id!), isNull(catalogComponents.deletedAt)))
    .returning({ id: catalogComponents.id });
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: null });
});

export default router;
