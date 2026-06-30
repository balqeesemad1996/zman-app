import { Link } from "wouter";
import { usePathname } from "@/lib/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/config/nav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}

export function AppShell({ children, title, action }: AppShellProps) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-canvas text-ink font-sans">
      {/* شريط تنبيه انقطاع الشبكة */}
      {!isOnline && (
        <div className="shrink-0 w-full h-[2px] bg-warn" aria-hidden="true" />
      )}

      {/* الشريط الجانبي للديسكتوب */}
      <aside className="hidden lg:flex fixed top-0 inset-e-0 h-screen w-[240px] flex-col bg-paper border-s border-hairline z-40">
        <div className="h-16 flex items-center px-6 border-b border-hairline shrink-0">
          <span className="text-xl font-bold text-info">Zman</span>
        </div>
        <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md text-base transition-colors",
                  isActive
                    ? "bg-info-soft text-info font-bold"
                    : "text-ink-2 hover:bg-canvas hover:text-ink",
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* هيدر الموبايل */}
      <header className="lg:hidden shrink-0 h-14 bg-paper border-b border-hairline flex items-center justify-between px-4 z-30">
        <h1 className="text-lg font-bold text-ink truncate">{title || "Zman"}</h1>
        {action && <div className="flex items-center shrink-0 ms-2">{action}</div>}
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-hidden w-full lg:pe-[240px] flex flex-col">
        {/* شريط الديسكتوب العلوي */}
        <div className="hidden lg:flex shrink-0 items-center justify-between px-8 h-16 border-b border-hairline bg-paper">
          <h2 className="text-xl font-bold text-ink">{title || "الرئيسية"}</h2>
          {action && <div>{action}</div>}
        </div>

        {/* منطقة التمرير الداخلية */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 pt-4 pb-24 lg:pt-8 lg:pb-8 flex flex-col">
            {children}
          </div>
        </div>
      </main>

      {/* شريط التنقل السفلي للموبايل */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-paper border-t border-hairline flex items-center justify-around z-30">
        {navItems.filter((item) => !item.desktopOnly).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full text-xs transition-colors",
                isActive
                  ? "text-info font-bold"
                  : "text-ink-3 hover:text-ink-2",
              )}
            >
              <Icon className="w-6 h-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
