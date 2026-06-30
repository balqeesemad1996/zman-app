import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const catalogComponent = pgTable(
  "catalog_component",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    defaultCostCents: integer("default_cost_cents").notNull().default(0),
    unit: text("unit").notNull().default("قطعة"),
    notes: text("notes").notNull().default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("catalog_name_length", sql`char_length(${t.name}) <= 200`),
    check("catalog_cost_nonnegative", sql`${t.defaultCostCents} >= 0`),
    check("catalog_unit_length", sql`char_length(${t.unit}) <= 32`),
    check("catalog_notes_length", sql`char_length(${t.notes}) <= 1000`),
    index("catalog_name_idx").on(t.name).where(sql`deleted_at is null`),
  ],
);

export type CatalogComponent = typeof catalogComponent.$inferSelect;
export type NewCatalogComponent = Pick<CatalogComponent, "name" | "defaultCostCents" | "unit" | "notes">;
