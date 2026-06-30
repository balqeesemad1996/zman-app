CREATE INDEX "purchase_supplier_idx" ON "purchase" USING btree ("supplier") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "sale_source_idx" ON "sale" USING btree ("source") WHERE deleted_at is null;--> statement-breakpoint
DROP TRIGGER IF EXISTS order_set_updated_at ON "order";--> statement-breakpoint
CREATE TRIGGER order_set_updated_at BEFORE UPDATE ON "order" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS order_component_set_updated_at ON "order_component";--> statement-breakpoint
CREATE TRIGGER order_component_set_updated_at BEFORE UPDATE ON "order_component" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS purchase_set_updated_at ON "purchase";--> statement-breakpoint
CREATE TRIGGER purchase_set_updated_at BEFORE UPDATE ON "purchase" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS expense_set_updated_at ON "expense";--> statement-breakpoint
CREATE TRIGGER expense_set_updated_at BEFORE UPDATE ON "expense" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS sale_set_updated_at ON "sale";--> statement-breakpoint
CREATE TRIGGER sale_set_updated_at BEFORE UPDATE ON "sale" FOR EACH ROW EXECUTE FUNCTION set_updated_at();