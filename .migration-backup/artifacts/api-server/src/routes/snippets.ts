import { Router } from "express";
import { and, desc, eq, isNull, like } from "drizzle-orm";
import { db } from "@workspace/db";
import { snippets } from "@workspace/db/schema";

const router = Router();

router.get("/snippets", async (req, res) => {
  const { cursor, limit = "100", search } = req.query as Record<string, string>;
  const lim = Math.min(Number(limit) || 100, 500);

  const conditions = [isNull(snippets.deletedAt)];
  if (search) {
    conditions.push(like(snippets.title, `%${search}%`));
  }

  let rows = await db
    .select()
    .from(snippets)
    .where(and(...conditions))
    .orderBy(desc(snippets.createdAt));

  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    if (idx !== -1) rows = rows.slice(idx + 1);
  }

  const hasNextPage = rows.length > lim;
  const page = hasNextPage ? rows.slice(0, lim) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1]?.id : undefined;
  res.json({ items: page, nextCursor });
});

router.post("/snippets", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const now = new Date();
  const [row] = await db
    .insert(snippets)
    .values({
      title: String(d.title || ""),
      body: String(d.body || ""),
      category: String(d.category || "عام"),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  res.status(201).json({ status: "ok", data: row });
});

router.patch("/snippets/:id", async (req, res) => {
  const d = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (d.title !== undefined) updates.title = String(d.title);
  if (d.body !== undefined) updates.body = String(d.body);
  if (d.category !== undefined) updates.category = String(d.category);

  const [row] = await db
    .update(snippets)
    .set(updates)
    .where(and(eq(snippets.id, req.params.id!), isNull(snippets.deletedAt)))
    .returning();
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: row });
});

router.delete("/snippets/:id", async (req, res) => {
  const [row] = await db
    .update(snippets)
    .set({ deletedAt: new Date() })
    .where(and(eq(snippets.id, req.params.id!), isNull(snippets.deletedAt)))
    .returning({ id: snippets.id });
  if (!row) return res.status(404).json({ error: "غير موجود" });
  return res.json({ status: "ok", data: null });
});

export default router;
