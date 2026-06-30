"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 ثانية افتراضياً للقوائم
            gcTime: 5 * 60 * 1000, // 5 دقائق للمخزن المؤقت
            refetchOnWindowFocus: false, // تجنب التحديث عند التركيز فقط
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
