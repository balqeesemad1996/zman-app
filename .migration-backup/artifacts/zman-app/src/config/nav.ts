import { BarChart3, BookOpen, ClipboardList, FileText, Home, Wallet } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  desktopOnly?: boolean;
}

// 4 تبويبات للموبايل (حد مريح للإبهام) + كتالوج في الديسكتوب فقط
export const navItems: NavItem[] = [
  {
    label: "الرئيسية",
    href: "/",
    icon: Home,
  },
  {
    label: "الطلبات",
    href: "/orders",
    icon: ClipboardList,
  },
  {
    label: "المالية",
    href: "/finance",
    icon: Wallet,
  },
  {
    label: "التقارير",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "الكتالوج",
    href: "/catalog",
    icon: BookOpen,
    desktopOnly: true,
  },
  {
    label: "القوالب",
    href: "/snippets",
    icon: FileText,
    desktopOnly: true,
  },
];
