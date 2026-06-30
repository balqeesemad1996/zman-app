import { formatFilsToJod } from "./money";

/**
 * تنظيف رقم الهاتف وتحويله للصيغة الدولية الافتراضية (الأردن 962)
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";

  // إزالة أي رموز غير رقمية
  let clean = phone.replace(/\D/g, "");

  // معالجة صيغ الهاتف الأردني الشائعة
  if (clean.startsWith("00962")) {
    clean = clean.slice(2);
  } else if (clean.startsWith("07")) {
    clean = `962${clean.slice(1)}`;
  } else if (clean.startsWith("7") && clean.length === 9) {
    clean = `962${clean}`;
  }

  return clean;
}

/**
 * إنشاء رابط wa.me الموجه لتطبيق WhatsApp مع نص رسالة جاهز (§18 rule 14)
 */
export function buildOrderWhatsAppLink(order: {
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  totalPriceCents: number;
  notes?: string;
}): string {
  const cleanPhone = cleanPhoneNumber(order.customerPhone);
  const formattedPrice = formatFilsToJod(order.totalPriceCents);

  const message = `مرحباً سيد/ة ${order.customerName}،

يسعدنا تأكيد تفاصيل طلبك كالتالي:
- المنتج: ${order.productName}
- الكمية: ${order.quantity}
- السعر الإجمالي: ${formattedPrice}
${order.notes ? `- ملاحظات إضافية: ${order.notes}\n` : ""}
شكراً لثقتك بنا وتعاملك معنا!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
