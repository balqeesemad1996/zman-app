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
          />
        </QueryProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
