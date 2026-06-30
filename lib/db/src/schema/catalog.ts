import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const catalogComponents = pgTable("catalog_components", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  defaultCostCents: integer("default_cost_cents").notNull().default(0),
  unit: text("unit").notNull().default("قطعة"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});
