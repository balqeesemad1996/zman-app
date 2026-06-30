"use server";

import { and, desc, isNull, sql } from "drizzle-orm";
import { expense, purchase, sale } from "@/features/finance/db";
import { order } from "@/features/orders/db";
import { db } from "@/lib/db/client";

export interface FinancialSummary {
  sales: number;
  expenses: number;
  purchases: number;
  netProfit: number;
}

export interface ActivityItem {
  id: string;
  type: "order" | "sale" | "expense" | "purchase";
  title: string;
  amount: number;
  date: Date;
  metadata?: string;
}

// 1. حساب المخلص المالي للفترة المحددة (§12) بالتوازي
export async function getFinancialSummary(
  startDate: string,
  endDate: string,
): Promise<FinancialSummary> {
  const [salesPromise, expensesPromise, purchasesPromise] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${sale.amountCents}), 0)::int`,
      })
      .from(sale)
      .where(
        and(
          isNull(sale.deletedAt),
          sql`${sale.date} >= ${startDate}`,
          sql`${sale.date} <= ${endDate}`,
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${expense.amountCents}), 0)::int`,
      })
      .from(expense)
      .where(
        and(
          isNull(expense.deletedAt),
          sql`${expense.date} >= ${startDate}`,
          sql`${expense.date} <= ${endDate}`,
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${purchase.totalCents}), 0)::int`,
      })
      .from(purchase)
      .where(
        and(
          isNull(purchase.deletedAt),
          sql`${purchase.date} >= ${startDate}`,
          sql`${purchase.date} <= ${endDate}`,
        ),
      ),
  ]);

  const [salesResult] = salesPromise;
  const [expensesResult] = expensesPromise;
  const [purchasesResult] = purchasesPromise;

  const sales = salesResult?.total ?? 0;
  const expenses = expensesResult?.total ?? 0;
  const purchases = purchasesResult?.total ?? 0;
  const netProfit = sales - expenses - purchases;

  return { sales, expenses, purchases, netProfit };
}

// 2. جلب آخر النشاطات عبر الجداول الأربعة بشكل متوازٍ (§5.7)
export async function getRecentActivities(): Promise<ActivityItem[]> {
  const [recentOrders, recentSales, recentExpenses, recentPurchases] =
    await Promise.all([
      db
        .select({
          id: order.id,
          customerName: order.customerName,
          totalPriceCents: order.totalPriceCents,
          createdAt: order.createdAt,
        })
        .from(order)
        .where(isNull(order.deletedAt))
        .orderBy(desc(order.createdAt))
        .limit(5),
      db
        .select({
          id: sale.id,
          description: sale.description,
          amountCents: sale.amountCents,
          createdAt: sale.createdAt,
        })
        .from(sale)
        .where(isNull(sale.deletedAt))
        .orderBy(desc(sale.createdAt))
        .limit(5),
      db
        .select({
          id: expense.id,
          category: expense.category,
          amountCents: expense.amountCents,
          createdAt: expense.createdAt,
        })
        .from(expense)
        .where(isNull(expense.deletedAt))
        .orderBy(desc(expense.createdAt))
        .limit(5),
      db
        .select({
          id: purchase.id,
          item: purchase.item,
          totalCents: purchase.totalCents,
          createdAt: purchase.createdAt,
        })
        .from(purchase)
        .where(isNull(purchase.deletedAt))
        .orderBy(desc(purchase.createdAt))
        .limit(5),
    ]);

  // تحويل ودمج البيانات
  const activities: ActivityItem[] = [
    ...recentOrders.map((o) => ({
      id: o.id,
      type: "order" as const,
      title: `طلب جديد للعميل ${o.customerName}`,
      amount: o.totalPriceCents,
      date: new Date(o.createdAt),
    })),
    ...recentSales.map((s) => ({
      id: s.id,
      type: "sale" as const,
      title: s.description || "عملية مبيعات",
      amount: s.amountCents,
      date: new Date(s.createdAt),
    })),
    ...recentExpenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      title: `مصروف: ${e.category}`,
      amount: e.amountCents,
      date: new Date(e.createdAt),
    })),
    ...recentPurchases.map((p) => ({
      id: p.id,
      type: "purchase" as const,
      title: `شراء مواد: ${p.item}`,
      amount: p.totalCents,
      date: new Date(p.createdAt),
    })),
  ];

  // ترتيب النشاطات تنازلياً وأخذ آخر 8 فقط
  return activities
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);
}

// 3. جلب بيانات التوجه المالي للرسم البياني لآخر 30 يوماً بالتوازي
export async function getFinancialTrendData(
  startDate: string,
  endDate: string,
) {
  const [salesTrend, expensesTrend, purchasesTrend] = await Promise.all([
    db
      .select({
        day: sale.date,
        total: sql<number>`sum(${sale.amountCents})::int`,
      })
      .from(sale)
      .where(
        and(
          isNull(sale.deletedAt),
          sql`${sale.date} >= ${startDate}`,
          sql`${sale.date} <= ${endDate}`,
        ),
      )
      .groupBy(sale.date),
    db
      .select({
        day: expense.date,
        total: sql<number>`sum(${expense.amountCents})::int`,
      })
      .from(expense)
      .where(
        and(
          isNull(expense.deletedAt),
          sql`${expense.date} >= ${startDate}`,
          sql`${expense.date} <= ${endDate}`,
        ),
      )
      .groupBy(expense.date),
    db
      .select({
        day: purchase.date,
        total: sql<number>`sum(${purchase.totalCents})::int`,
      })
      .from(purchase)
      .where(
        and(
          isNull(purchase.deletedAt),
          sql`${purchase.date} >= ${startDate}`,
          sql`${purchase.date} <= ${endDate}`,
        ),
      )
      .groupBy(purchase.date),
  ]);

  return { salesTrend, expensesTrend, purchasesTrend };
}
