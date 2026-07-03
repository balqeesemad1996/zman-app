import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import QueryProvider from "@/providers/query-provider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const cairo = localFont({
  src: [
    {
      path: "./fonts/cairo-arabic.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zman",
  description: "أداة Zman الداخلية لإدارة الطلبات والمالية",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zman",
  },
};

export const viewport: Viewport = {
  themeColor: "#1565c0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="antialiased bg-canvas text-ink font-sans">
        <QueryProvider>
          {children}
          <Toaster
            dir="rtl"
            position="top-center"
            theme="light"
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: "var(--font-sans), system-ui, sans-serif",
                zIndex: 50,
              },
              classNames: {
                toast: "bg-paper text-ink border border-hairline-2",
                success: "bg-emerald-soft text-emerald-deep border-emerald/20",
                error: "bg-alert-soft text-alert border-alert/20",
                warning: "bg-warn-soft text-warn-deep border-warn/20",
                info: "bg-info-soft text-info border-info/20",
              }
            }}
          />
        </QueryProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
