/**
 * خريطة لترجمة أخطاء قاعدة البيانات وحالة الاتصال لرسائل عربية واضحة ومفهومة للمستخدم (§18)
 */
export function mapDbError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message || "";
    // استخلاص رمز الخطأ من Postgres (إن وجد)
    const code = (err as any).code;

    if (code === "23505") {
      return "هذا الإجراء تم تنفيذه مسبقاً (سجل مكرر)";
    }
    if (code === "23503") {
      return "فشل الربط: المرجع أو السجل ذو الصلة غير موجود";
    }
    if (code === "23514") {
      return "فشل التحقق: قيمة الحقل المدخلة غير صالحة";
    }
    if (
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      msg.toLowerCase().includes("connection") ||
      msg.toLowerCase().includes("timeout")
    ) {
      return "تعذر الاتصال بقاعدة البيانات — يرجى التأكد من حالة الخادم وحاول مرة أخرى بعد لحظات";
    }
    return msg || "حدث خطأ غير متوقع أثناء معالجة العملية";
  }
  return typeof err === "string" ? err : "حدث خطأ غير متوقع في النظام";
}
