import { z } from "zod";

export const orderComponentInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "اسم المكوّن مطلوب").max(200, "اسم المكوّن طويل جداً"),
  costCents: z.number().int().nonnegative("التكلفة يجب أن تكون صفر أو أكثر"),
  quantity: z.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
});

export const createOrderSchema = z.object({
  requestId: z.string().uuid("معرف الطلب الفريد مطلوب للمطابقة ومنع التكرار"),
  customerName: z
    .string()
    .min(1, "اسم العميل مطلوب")
    .max(200, "اسم العميل طويل جداً"),
  customerPhone: z
    .string()
    .min(1, "رقم الهاتف مطلوب")
    .max(32, "رقم الهاتف طويل جداً"),
  productName: z
    .string()
    .min(1, "اسم المنتج مطلوب")
    .max(200, "اسم المنتج طويل جداً"),
  quantity: z.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
  components: z.array(orderComponentInputSchema),
  overheadCostCents: z.number().int().nonnegative("التكاليف الإضافية يجب أن تكون صفر أو أكثر").default(0),
  totalPriceCents: z
    .number()
    .int()
    .nonnegative("السعر الإجمالي يجب أن يكون صفر أو أكثر"),
  notes: z.string().max(1000, "الملاحظات طويلة جداً").optional().default(""),
});

export const ORDER_STATUSES = ["draft", "sent", "confirmed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: "مسودة",
  sent: "تم الإرسال",
  confirmed: "مؤكد",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

export const updateOrderSchema = z.object({
  id: z.string().uuid("معرف الطلب غير صالح"),
  updatedAt: z.string().min(1, "طابع التعديل مطلوب لمنع التضارب"), // لغايات التزامن المتفائل
  status: z.enum(ORDER_STATUSES).optional(),
  customerName: z
    .string()
    .min(1, "اسم العميل مطلوب")
    .max(200, "اسم العميل طويل جداً"),
  customerPhone: z
    .string()
    .min(1, "رقم الهاتف مطلوب")
    .max(32, "رقم الهاتف طويل جداً"),
  productName: z
    .string()
    .min(1, "اسم المنتج مطلوب")
    .max(200, "اسم المنتج طويل جداً"),
  quantity: z.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
  components: z.array(orderComponentInputSchema),
  overheadCostCents: z.number().int().nonnegative("التكاليف الإضافية يجب أن تكون صفر أو أكثر").default(0),
  totalPriceCents: z
    .number()
    .int()
    .nonnegative("السعر الإجمالي يجب أن يكون صفر أو أكثر"),
  notes: z.string().max(1000, "الملاحظات طويلة جداً").optional().default(""),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderComponentInput = z.infer<typeof orderComponentInputSchema>;

export const patchOrderStatusSchema = z.object({
  id: z.string().uuid(),
  updatedAt: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
});
export type PatchOrderStatusInput = z.infer<typeof patchOrderStatusSchema>;
