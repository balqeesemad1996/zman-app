import { api } from "@/lib/api";
import { formatFilsToJod } from "@/lib/money";

export type ActionResponse<T = unknown> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

function today() {
  return new Date().toLocaleDateString("ar-JO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export async function downloadReport(
  type: "pnl" | "expenses" | "sales" | "orders" | "products",
): Promise<ActionResponse<string>> {
  try {
    const [salesAll, expensesAll, purchasesAll, ordersAll] = await Promise.all([
      api.get<{ items: { date: string; description: string; amountCents: number; source: string }[] }>("/sales", { limit: 1000 }).then(r => r.items),
      api.get<{ items: { category: string; amountCents: number }[] }>("/expenses", { limit: 1000 }).then(r => r.items),
      api.get<{ items: { totalCents: number }[] }>("/purchases", { limit: 1000 }).then(r => r.items),
      api.get<{ items: { customerName: string; productName: string; status: string; totalPriceCents: number; quantity: number }[] }>("/orders", { limit: 1000 }).then(r => r.items),
    ]);

    const totalSales = salesAll.reduce((s, i) => s + i.amountCents, 0);
    const totalExpenses = expensesAll.reduce((s, i) => s + i.amountCents, 0);
    const totalPurchases = purchasesAll.reduce((s, i) => s + i.totalCents, 0);
    const net = totalSales - totalExpenses - totalPurchases;

    let markdown = "";

    if (type === "pnl") {
      markdown = `# تقرير الأرباح والخسائر\n**التاريخ:** ${today()}\n\n`;
      markdown += `| البند | المبلغ |\n|---|---|\n`;
      markdown += `| إجمالي المبيعات | ${formatFilsToJod(totalSales)} |\n`;
      markdown += `| إجمالي المشتريات | ${formatFilsToJod(totalPurchases)} |\n`;
      markdown += `| إجمالي المصاريف | ${formatFilsToJod(totalExpenses)} |\n`;
      markdown += `| **صافي الربح** | **${formatFilsToJod(net)}** |\n`;
    } else if (type === "expenses") {
      const cats: Record<string, number> = {};
      for (const e of expensesAll) cats[e.category] = (cats[e.category] || 0) + e.amountCents;
      markdown = `# تقرير فئات المصاريف\n**التاريخ:** ${today()}\n\n| الفئة | المبلغ |\n|---|---|\n`;
      for (const [cat, amount] of Object.entries(cats)) {
        markdown += `| ${cat} | ${formatFilsToJod(amount)} |\n`;
      }
    } else if (type === "sales") {
      markdown = `# تقرير المبيعات\n**التاريخ:** ${today()}\n\n| التاريخ | الوصف | المبلغ | المصدر |\n|---|---|---|---|\n`;
      for (const s of salesAll) {
        markdown += `| ${s.date} | ${s.description} | ${formatFilsToJod(s.amountCents)} | ${s.source === "order" ? "طلب" : "يدوي"} |\n`;
      }
    } else if (type === "orders") {
      markdown = `# تقرير الطلبات\n**التاريخ:** ${today()}\n\n| العميل | المنتج | الحالة | السعر |\n|---|---|---|---|\n`;
      for (const o of ordersAll) {
        markdown += `| ${o.customerName} | ${o.productName} | ${o.status} | ${formatFilsToJod(o.totalPriceCents)} |\n`;
      }
    } else if (type === "products") {
      const products: Record<string, { count: number; revenue: number }> = {};
      for (const o of ordersAll) {
        if (!products[o.productName]) products[o.productName] = { count: 0, revenue: 0 };
        products[o.productName]!.count += o.quantity;
        products[o.productName]!.revenue += o.totalPriceCents;
      }
      const sorted = Object.entries(products).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 15);
      markdown = `# أكثر المنتجات طلباً\n**التاريخ:** ${today()}\n\n| المنتج | الكمية | الإيرادات |\n|---|---|---|\n`;
      for (const [name, { count, revenue }] of sorted) {
        markdown += `| ${name} | ${count} | ${formatFilsToJod(revenue)} |\n`;
      }
    }

    return { status: "ok", data: markdown };
  } catch (err) {
    return { status: "error", message: String(err) };
  }
}
