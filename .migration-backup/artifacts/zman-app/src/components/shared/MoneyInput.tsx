

import { useEffect, useId, useState } from "react";

interface MoneyInputProps {
  value: number; // بالفلس (fils)
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function MoneyInput({
  value,
  onChange,
  label,
  error,
  disabled,
  placeholder,
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const inputId = useId();

  // مزامنة القيمة المعروضة مع القيمة الحقيقية الواردة من النموذج (مثلاً عند الاسترجاع أو التراجع عن الحذف)
  useEffect(() => {
    if (value === 0 || value === undefined || value === null) {
      if (displayValue !== "") setDisplayValue("");
    } else {
      const currentParsedFils = Math.round(
        Number.parseFloat(displayValue || "0") * 1000,
      );
      if (currentParsedFils !== value) {
        setDisplayValue((value / 1000).toString());
      }
    }
  }, [value, displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // تنظيف المدخلات للسماح بالأرقام والنقطة العشرية فقط
    val = val.replace(/[^0-9.]/g, "");

    // معالجة الفاصلة العشرية المتكررة
    const parts = val.split(".");
    if (parts.length > 2) {
      val = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    setDisplayValue(val);

    const fils = val ? Math.round(Number.parseFloat(val) * 1000) : 0;
    if (!Number.isNaN(fils)) {
      onChange(fils);
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    if (displayValue) {
      const parsed = Number.parseFloat(displayValue);
      if (!Number.isNaN(parsed)) {
        // تثبيت العرض على 3 خانات عشرية عند مغادرة الحقل
        setDisplayValue(parsed.toFixed(3));
      }
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-ink-2">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          pattern="[0-9.]*"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || "0.000"}
          className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors disabled:opacity-50 text-start"
        />
        {/* رمز العملة مثبت على اليسار في الواجهة العربية RTL */}
        <span className="absolute inset-e-4 text-sm text-ink-3 pointer-events-none">
          د.أ.
        </span>
      </div>
      {error && <span className="text-xs text-alert">{error}</span>}
    </div>
  );
}
