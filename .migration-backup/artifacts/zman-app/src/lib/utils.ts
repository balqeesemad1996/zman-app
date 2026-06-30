import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * دمج فئات Tailwind مع حل التضاربات تلقائياً
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * دالة لتأخير التنفيذ (مفيدة للاختبار والمحاكاة)
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
