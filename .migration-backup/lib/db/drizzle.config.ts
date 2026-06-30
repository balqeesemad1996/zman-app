import { defineConfig } from "drizzle-kit";
import path from "path";

// For migrations, use the DIRECT connection URL (Supabase port 5432).
// Supabase's pooler (port 6543) doesn't support DDL statements.
// In dev, DATABASE_URL (Replit built-in) works for both.
const migrationUrl = process.env.MIGRATE_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_URL (or MIGRATE_URL) must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
