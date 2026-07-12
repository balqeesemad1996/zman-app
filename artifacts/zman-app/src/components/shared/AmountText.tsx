interface AmountTextProps {
  amount: number;
  className?: string;
  sign?: "+" | "-" | "auto";
  /** إخفاء رمز العملة "د.أ" (يُستخدم في الداشبورد حيث العملة معروفة). */
  hideCurrency?: boolean;
  /** عرض السالب بين قوسين (أسلوب محاسبي) بدل إشارة "−". */
  parenNegative?: boolean;
  /** عرض القيمة بين قوسين دائماً — للبنود المطروحة (مشتريات/مصاريف/سحوبات)
   *  حتى لو كانت القيمة موجبة، لأنها تُخصم من الإجمالي. */
  alwaysParen?: boolean;
}

/**
 * يعرض المبلغ بعملة موحدة: علامة + رقم + "د.أ" في وحدة inline-flex واحدة
 * لمنع انفصال العلامة عن الرقم في RTL.
 * sign="auto" يعرض + للموجب و − للسالب تلقائياً (بدون عرض + للصفر).
 * hideCurrency يُخفي "د.أ". parenNegative يعرض السالب بين قوسين بلا إشارة.
 * alwaysParen يعرض القيمة بين قوسين دائماً (بند مطروح).
 */
export function AmountText({
  amount,
  className,
  sign,
  hideCurrency,
  parenNegative,
  alwaysParen,
}: AmountTextProps) {
  const isNegative = amount < 0;

  // نمط القوسين: للبنود المطروحة دائماً (alwaysParen)، أو للسالب (parenNegative).
  if (alwaysParen || (parenNegative && isNegative)) {
    return (
      <span
        className={className}
        dir="ltr"
        style={{ display: "inline-flex", alignItems: "baseline", gap: "0.15em" }}
      >
        <span>({formatFilsToJodRaw(Math.abs(amount))})</span>
        {!hideCurrency && <span className="text-[0.85em] opacity-70">د.أ</span>}
      </span>
    );
  }

  let prefix = "";
  if (sign === "auto") {
    prefix = amount > 0 ? "+" : amount < 0 ? "−" : "";
  } else if (sign === "+") {
    prefix = "+";
  } else if (sign === "-") {
    prefix = "−";
  }

  return (
    <span
      className={className}
      dir="ltr"
      style={{ display: "inline-flex", alignItems: "baseline", gap: "0.15em" }}
    >
      {prefix && <span style={{ fontWeight: "inherit" }}>{prefix}</span>}
      <span>{formatFilsToJodRaw(amount)}</span>
      {!hideCurrency && <span className="text-[0.85em] opacity-70">د.أ</span>}
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
