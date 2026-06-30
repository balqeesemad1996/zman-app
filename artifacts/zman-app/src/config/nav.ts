import { BarChart3, BookOpen, ClipboardList, Home, MessageSquare, Wallet } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** كل عناصر التنقل — تُستخدم في الشريط الجانبي (الديسكتوب) */
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
    label: "الكتالوج",
    href: "/catalog",
    icon: BookOpen,
  },
  {
    label: "المقتطفات",
    href: "/snippets",
    icon: MessageSquare,
  },
  {
    label: "التقارير",
    href: "/reports",
    icon: BarChart3,
  },
];

/** التبويبات الأساسية للشريط السفلي في الموبايل (4 عناصر) */
export const mainNavItems: NavItem[] = [
  navItems[0], // الرئيسية
  navItems[1], // الطلبات
  navItems[2], // المالية
  navItems[5], // التقارير
];

/** العناصر الإضافية التي تظهر في sheet "المزيد" */
export const moreNavItems: NavItem[] = [
  navItems[3], // الكتالوج
  navItems[4], // المقتطفات
];
