"use client";

import { Edit, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AmountText } from "@/components/shared/AmountText";
import { DateText } from "@/components/shared/DateText";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { cn } from "@/lib/utils";
import { buildOrderWhatsAppLink } from "@/lib/whatsapp";
import type { Order } from "../types";

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onClick: (order: Order) => void;
}

// ترجمة الحالات للعربية
const statusTranslations: Record<string, string> = {
  draft: "مسودة",
  sent: "تم الإرسال",
  confirmed: "مؤكد",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

export function OrderCard({
  order,
  onEdit,
  onDelete,
  onClick,
}: OrderCardProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // مواءمة الألوان الدلالية للحالة مع العقد (§14.3.2)
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "cancelled":
        return "bg-alert-soft text-alert-deep border-alert/20";
      case "draft":
        return "bg-warn-soft text-warn-deep border-warn/20";
      default:
        // الحالات المؤكدة والموصولة والمرسلة تشترك في اللون الأزرق (لا وجود للأخضر في المرحلة 1) (§14.3.2)
        return "bg-info-soft text-info border-info/20";
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionsOpen(false);
    const link = buildOrderWhatsAppLink(order);
    window.open(link, "_blank");
    toast.info("تم الانتقال لتطبيق WhatsApp لإرسال الطلب");
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: card is an interactive wrapper containing other buttons, so div role=button is the only valid HTML layout */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(order)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(order);
          }
        }}
        className="p-4 rounded-lg bg-paper border border-hairline shadow-sm hover:border-hairline-2 transition-colors cursor-pointer flex flex-col gap-3 relative"
      >
        {/* السطر الأول: اسم العميل وحالة الطلب + زر الخيارات */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-ink truncate text-base leading-tight">
              {order.customerName}
            </span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-semibold border leading-none flex items-center justify-center h-5",
                getStatusClasses(order.status),
              )}
            >
              {statusTranslations[order.status] || order.status}
            </span>
          </div>

          {/* زر الخيارات: متجاوب وأكبر من 44px لملاءمة اللمس (§9.1) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsActionsOpen(true);
            }}
            className="p-2 -me-2 rounded-full hover:bg-canvas text-ink-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="خيارات الطلب"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* السطر الثاني: اسم المنتج المطلوب */}
        <div className="text-sm text-ink-2 truncate">
          {order.productName} {order.quantity > 1 && `(عدد ${order.quantity})`}
        </div>

        {/* السطر الثالث: السعر النهائي (يسار RTL) والتاريخ (يمين RTL) */}
        <div className="flex justify-between items-end border-t border-hairline pt-3 mt-1">
          {/* التاريخ النسبي في جهة اليسار باللغة العربية (§10.1) */}
          <span className="text-xs text-ink-3">
            <DateText date={order.createdAt} relative />
          </span>

          {/* السعر النهائي عريض باللون الدلالي الأساسي (§10.1) */}
          <span className="text-lg font-bold text-info leading-none">
            <AmountText amount={order.totalPriceCents} />
          </span>
        </div>
      </div>

      {/* شيت الإجراءات المنبثق من الأسفل للموبايل والـ Dialog للديسكتوب (§9.3) */}
      <ResponsiveModal
        isOpen={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        title="خيارات الطلب"
      >
        <div className="space-y-2">
          {/* خيار واتساب */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full min-h-[44px] px-4 py-3 rounded-md hover:bg-canvas text-ink-2 flex items-center gap-3 transition-colors text-start"
          >
            <MessageSquare className="w-5 h-5 text-info" />
            <span>إرسال تفاصيل العرض عبر واتساب</span>
          </button>

          {/* خيار تعديل */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsActionsOpen(false);
              onEdit(order);
            }}
            className="w-full min-h-[44px] px-4 py-3 rounded-md hover:bg-canvas text-ink-2 flex items-center gap-3 transition-colors text-start"
          >
            <Edit className="w-5 h-5" />
            <span>تعديل بيانات الطلب</span>
          </button>

          <hr className="border-hairline my-2" />

          {/* خيار حذف */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsActionsOpen(false);
              onDelete(order);
            }}
            className="w-full min-h-[44px] px-4 py-3 rounded-md hover:bg-alert-soft text-alert flex items-center gap-3 transition-colors text-start font-semibold"
          >
            <Trash2 className="w-5 h-5" />
            <span>حذف الطلب نهائياً</span>
          </button>
        </div>
      </ResponsiveModal>
    </>
  );
}
