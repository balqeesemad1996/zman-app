import { Router } from "express";
import { db } from "@workspace/db";
import { orders, purchases, expenses, sales } from "@workspace/db/schema";
import { isNull, and, gte, lte, desc } from "drizzle-orm";

const router = Router();

// GET /api/dashboard/summary?startDate=&endDate=
router.get("/dashboard/summary", async (req, res) => {
  const { startDate, endDate } = req.query as { startDate: string; endDate: string };

  const [salesRows, expensesRows, purchasesRows] = await Promise.all([
    db.select({ amountCents: sales.amountCents }).from(sales).where(
      and(isNull(sales.deletedAt), gte(sales.date, startDate), lte(sales.date, endDate))
    ),
    db.select({ amountCents: expenses.amountCents }).from(expenses).where(
      and(isNull(expenses.deletedAt), gte(expenses.date, startDate), lte(expenses.date, endDate))
    ),
    db.select({ totalCents: purchases.totalCents }).from(purchases).where(
      and(isNull(purchases.deletedAt), gte(purchases.date, startDate), lte(purchases.date, endDate))
    ),
  ]);

  const totalSales = salesRows.reduce((s, r) => s + r.amountCents, 0);
  const totalExpenses = expensesRows.reduce((s, r) => s + r.amountCents, 0);
  const totalPurchases = purchasesRows.reduce((s, r) => s + r.totalCents, 0);

  res.json({
    sales: totalSales,
    expenses: totalExpenses,
    purchases: totalPurchases,
    netProfit: totalSales - totalExpenses - totalPurchases,
  });
});

// GET /api/dashboard/activities
router.get("/dashboard/activities", async (_req, res) => {
  const [recentOrders, recentSales, recentExpenses, recentPurchases] = await Promise.all([
    db.select().from(orders).where(isNull(orders.deletedAt)).orderBy(desc(orders.createdAt)).limit(5),
    db.select().from(sales).where(isNull(sales.deletedAt)).orderBy(desc(sales.createdAt)).limit(5),
    db.select().from(expenses).where(isNull(expenses.deletedAt)).orderBy(desc(expenses.createdAt)).limit(5),
    db.select().from(purchases).where(isNull(purchases.deletedAt)).orderBy(desc(purchases.createdAt)).limit(5),
  ]);

  const activities = [
    ...recentOrders.map((o) => ({
      id: o.id, type: "order",
      title: `طلب جديد للعميل ${o.customerName}`,
      amount: o.totalPriceCents, date: o.createdAt,
    })),
    ...recentSales.map((s) => ({
      id: s.id, type: "sale",
      title: s.description || "عملية مبيعات",
      amount: s.amountCents, date: s.createdAt,
    })),
    ...recentExpenses.map((e) => ({
      id: e.id, type: "expense",
      title: `مصروف: ${e.category}`,
      amount: e.amountCents, date: e.createdAt,
    })),
    ...recentPurchases.map((p) => ({
      id: p.id, type: "purchase",
      title: `شراء مواد: ${p.item}`,
      amount: p.totalCents, date: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()).slice(0, 8);

  res.json(activities);
});

// GET /api/dashboard/trends?startDate=&endDate=
router.get("/dashboard/trends", async (req, res) => {
  const { startDate, endDate } = req.query as { startDate: string; endDate: string };

  const [salesRows, expensesRows, purchasesRows] = await Promise.all([
    db.select({ date: sales.date, amountCents: sales.amountCents }).from(sales).where(
      and(isNull(sales.deletedAt), gte(sales.date, startDate), lte(sales.date, endDate))
    ),
    db.select({ date: expenses.date, amountCents: expenses.amountCents }).from(expenses).where(
      and(isNull(expenses.deletedAt), gte(expenses.date, startDate), lte(expenses.date, endDate))
    ),
    db.select({ date: purchases.date, totalCents: purchases.totalCents }).from(purchases).where(
      and(isNull(purchases.deletedAt), gte(purchases.date, startDate), lte(purchases.date, endDate))
    ),
  ]);

  const groupByDay = <T extends { date: string }>(items: T[], getAmount: (i: T) => number) => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.date] = (map[item.date] || 0) + getAmount(item);
    }
    return Object.entries(map).map(([day, total]) => ({ day, total }));
  };

  res.json({
    salesTrend: groupByDay(salesRows, (s) => s.amountCents),
    expensesTrend: groupByDay(expensesRows, (e) => e.amountCents),
    purchasesTrend: groupByDay(purchasesRows, (p) => p.totalCents),
  });
});

export default router;
