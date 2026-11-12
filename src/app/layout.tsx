import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, Fraunces, Instrument_Sans, Lora, Playfair_Display, Poppins, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
// Polices proposées dans l'onglet Design des quiz : sans préchargement, le navigateur ne télécharge que celles réellement utilisées.
// (next/font exige des options littérales : pas de décomposition d'objet.)
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-space-grotesk" });
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-poppins", weight: ["400", "500", "600", "700"] });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fraunces" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair" });
const fontVars = [instrument, bricolage, dmSans, spaceGrotesk, poppins, lora, fraunces, playfair].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: { default: "Leadora — Quiz marketing et qualification de prospects", template: "%s · Leadora" },
  description: "Créez des quiz marketing, collectez des prospects qualifiés et suivez vos conversions depuis un seul espace.",
  applicationName: "Leadora",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#151a2d" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={fontVars}>
      {/* suppressHydrationWarning : certaines extensions de navigateur modifient <body> avant l'hydratation. */}
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
