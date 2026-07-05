"use client";

import { AppShellProvider } from "@/providers/app-shell-context";
import { AppShell } from "@/components/layout/AppShell";
import { IdleLock } from "@/components/auth/IdleLock";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShellProvider>
      <IdleLock />
      <AppShell>{children}</AppShell>
    </AppShellProvider>
  );
}

