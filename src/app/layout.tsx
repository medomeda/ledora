import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Leadora — Quiz marketing et qualification de prospects", template: "%s · Leadora" },
  description: "Créez des quiz marketing, collectez des prospects qualifiés et suivez vos conversions depuis un seul espace.",
  applicationName: "Leadora",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#151a2d" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable}`}>
      {/* suppressHydrationWarning : certaines extensions de navigateur modifient <body> avant l'hydratation. */}
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
