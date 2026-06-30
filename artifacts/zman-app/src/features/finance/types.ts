import type { expense, purchase, sale } from "./db";

export type Purchase = typeof purchase.$inferSelect;
export type NewPurchase = typeof purchase.$inferInsert;

export type Expense = typeof expense.$inferSelect;
export type NewExpense = typeof expense.$inferInsert;

export type Sale = typeof sale.$inferSelect;
export type NewSale = typeof sale.$inferInsert;
