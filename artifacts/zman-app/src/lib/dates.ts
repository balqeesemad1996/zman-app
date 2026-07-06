import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

/** يحوّل الأرقام الهندية العربية (٠١٢…) إلى لاتينية (012…) */
export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * تنسيق التواريخ بأسماء عربية وأرقام لاتينية (إنجليزية) — لا أرقام هندية
 */
export function formatDate(date: Date | string, formatStr = "PPP"): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return toLatinDigits(format(d, formatStr, { locale: ar }));
}

/**
 * حساب الوقت النسبي (منذ ...) باللغة العربية
 */
export function formatRelativeTime(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { locale: ar, addSuffix: true });
}
