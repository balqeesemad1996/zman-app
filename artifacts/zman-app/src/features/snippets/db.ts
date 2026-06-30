import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const snippet = pgTable(
  "snippet",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull().default("عام"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("snippet_title_length", sql`char_length(${t.title}) <= 200`),
    check("snippet_body_length", sql`char_length(${t.body}) <= 5000`),
    check("snippet_category_length", sql`char_length(${t.category}) <= 64`),
    index("snippet_category_idx").on(t.category).where(sql`deleted_at is null`),
  ],
);

export type Snippet = typeof snippet.$inferSelect;
export type NewSnippet = Pick<Snippet, "title" | "body" | "category">;
