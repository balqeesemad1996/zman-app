// 1 JOD = 1000 fils. التخزين بالـ fils في قاعدة البيانات (حقل cents).
const JOD_DECIMALS = 3;

// منسق الأرقام باللغة العربية مع الأرقام اللاتينية الغربية (0-9) بناءً على قرار 194
// نستخدم decimal بدل currency لأن بعض متصفحات الموبايل تعرض "JOD" بدل "د.أ"
export const jodFormatter = new Intl.NumberFormat("ar-JO-u-nu-latn", {
  style: "decimal",
  minimumFractionDigits: JOD_DECIMALS,
  maximumFractionDigits: JOD_DECIMALS,
});

/**
 * تحويل القيمة من الفلس (التخزين) إلى نص منسق بالدينار الأردني (العرض)
 */
export function formatFilsToJod(fils: number): string {
  if (Number.isNaN(fils) || fils === null || fils === undefined) {
    return `${jodFormatter.format(0)} د.أ`;
  }
  return `${jodFormatter.format(fils / 1000)} د.أ`;
}

/**
 * تحويل نص منسق أو إدخال عشري بالدينار الأردني إلى فلس (عدد صحيح للتخزين)
 */
export function parseJodToFils(value: string | number): number {
  if (typeof value === "number") {
    return Math.round(value * 1000);
  }

  if (!value) return 0;

  // تحويل الأرقام العربية الشرقية (٠-٩) إلى أرقام غربية (0-9)
  let cleanValue = value;

  // إزالة التسميات والاختصارات الشائعة للعملة لتفادي تداخل النقاط (مثل د.أ.) مع الفاصلة العشرية
  cleanValue = cleanValue
    .replace(/د\.أ\.?/g, "")
    .replace(/jod/gi, "")
    .replace(/دينار/g, "");

  const easternNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  for (let i = 0; i < easternNumerals.length; i++) {
    const digit = easternNumerals[i];
    if (digit) {
      const regex = new RegExp(digit, "g");
      cleanValue = cleanValue.replace(regex, i.toString());
    }
  }

  // تنظيف النص من أي رموز ما عدا الأرقام والفاصلة العشرية
  cleanValue = cleanValue.replace(/[^0-9.]/g, "");

  const parsed = Number.parseFloat(cleanValue);
  if (Number.isNaN(parsed)) return 0;

  return Math.round(parsed * 1000);
}

/**
 * تنسيق الرقم كقيمة مالية عشرية بدون رمز العملة لعرضها في حقول الإدخال أثناء الكتابة
 */
export function formatFilsToInput(fils: number): string {
  if (Number.isNaN(fils) || !fils) return "";
  return (fils / 1000).toFixed(JOD_DECIMALS);
}
