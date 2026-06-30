import type { order, orderComponent } from "./db";

export type Order = typeof order.$inferSelect;
export type OrderComponent = typeof orderComponent.$inferSelect;

export interface OrderWithComponents extends Order {
  components: OrderComponent[];
}
