import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * تنسيق التواريخ باللغة العربية مع خيارات التنسيق المعتمدة
 */
export function formatDate(date: Date | string, formatStr = "PPP"): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr, { locale: ar });
}

/**
 * حساب الوقت النسبي (منذ ...) باللغة العربية
 */
export function formatRelativeTime(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { locale: ar, addSuffix: true });
}
