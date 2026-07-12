import { formatFilsToJod } from "@/lib/money";

interface AmountTextProps {
  amount: number;
  className?: string;
  sign?: "+" | "-" | "auto";
}

/**
 * يعرض المبلغ بعملة موحدة: علامة + رقم + "د.أ" في وحدة inline-flex واحدة
 * لمنع انفصال العلامة عن الرقم في RTL.
 * sign="auto" يعرض + للموجب و − للسالب تلقائياً (بدون عرض + للصفر).
 */
export function AmountText({ amount, className, sign }: AmountTextProps) {
  const formatted = formatFilsToJodRaw(amount);
  let prefix = "";
  if (sign === "auto") {
    prefix = amount > 0 ? "+" : amount < 0 ? "−" : "";
  } else if (sign === "+") {
    prefix = "+";
  } else if (sign === "-") {
    prefix = "−";
  }

  return (
    <span className={className} dir="ltr" style={{ display: "inline-flex", alignItems: "baseline", gap: "0.15em" }}>
      {prefix && <span style={{ fontWeight: "inherit" }}>{prefix}</span>}
      <span>{formatted}</span>
      <span className="text-[0.85em] opacity-70">د.أ</span>
    </span>
  );
}

/**
 * تنسيق المبلغ كرقم فقط (بدون رمز العملة) — للاستخدام الداخلي.
 */
function formatFilsToJodRaw(fils: number): string {
  if (Number.isNaN(fils) || fils === null || fils === undefined) {
    return (0).toFixed(3);
  }
  return (fils / 1000).toFixed(3);
}
