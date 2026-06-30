import { formatDate, formatRelativeTime } from "@/lib/dates";

interface DateTextProps {
  date: Date | string;
  relative?: boolean;
  formatStr?: string;
  className?: string;
}

export function DateText({
  date,
  relative = false,
  formatStr = "PPP",
  className,
}: DateTextProps) {
  if (!date) return null;
  return (
    <span className={className}>
      {relative ? formatRelativeTime(date) : formatDate(date, formatStr)}
    </span>
  );
}
