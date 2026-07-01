"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AppShellContextType {
  title: string;
  setTitle: (title: string) => void;
  action: ReactNode;
  setAction: (action: ReactNode) => void;
}

const AppShellContext = createContext<AppShellContextType | undefined>(undefined);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Zman");
  const [action, setAction] = useState<ReactNode>(null);

  return (
    <AppShellContext.Provider value={{ title, setTitle, action, setAction }}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShellProvider");
  }
  return context;
}

interface AppShellHeaderProps {
  title: string;
  action?: ReactNode;
}

export function AppShellHeader({ title, action }: AppShellHeaderProps) {
  const { setTitle, setAction } = useAppShell();

  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);

  useEffect(() => {
    setAction(action || null);
    return () => setAction(null);
  }, [action, setAction]);

  return null;
}
