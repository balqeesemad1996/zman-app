"use client";

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 5 }: SkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          // Use index as key since these are static visual placeholders
          // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton list
          key={index}
          className="p-4 rounded-lg bg-paper border border-hairline shadow-sm flex flex-col gap-3"
        >
          {/* السطر الأول: الاسم والحالة */}
          <div className="flex justify-between items-center">
            <div className="h-5 w-1/3 bg-shimmer animate-shimmer rounded" />
            <div className="h-5 w-16 bg-shimmer animate-shimmer rounded-full" />
          </div>

          {/* السطر الثاني: اسم المنتج */}
          <div className="h-4 w-1/2 bg-shimmer animate-shimmer rounded" />

          {/* السطر الثالث: التاريخ والمبلغ */}
          <div className="flex justify-between items-end border-t border-hairline pt-3 mt-1">
            <div className="h-3 w-1/4 bg-shimmer animate-shimmer rounded" />
            <div className="h-5 w-20 bg-shimmer animate-shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
