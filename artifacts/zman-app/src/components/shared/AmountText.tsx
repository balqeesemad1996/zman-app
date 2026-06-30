import { formatFilsToJod } from "@/lib/money";

interface AmountTextProps {
  amount: number;
  className?: string;
}

export function AmountText({ amount, className }: AmountTextProps) {
  return <span className={className}>{formatFilsToJod(amount)}</span>;
}
