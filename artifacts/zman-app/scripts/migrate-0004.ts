import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE "order"
      ADD COLUMN IF NOT EXISTS additional_costs_cents INTEGER NOT NULL DEFAULT 0
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "order"
        ADD CONSTRAINT additional_costs_nonneg
        CHECK (additional_costs_cents >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("Migration 0004: additional_costs_cents added to order");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
