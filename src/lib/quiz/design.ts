import type { CSSProperties } from "react";
import type { PlanId, QuizDesign } from "@/types/domain";

/**
 * Design de la page publique d'un quiz. Module pur (client et serveur) : thèmes, polices, valeurs par défaut et
 * traduction du design en variables CSS. Les composants de la page publique utilisent les mêmes jetons (`bg-primary`,
 * `text-muted-foreground`…) que l'application : on les surcharge simplement sur le conteneur du quiz.
 */
export const DEFAULT_DESIGN: QuizDesign = {
  themeId: "classique",
  primaryColor: null,
  accentColor: null,
  backgroundColor: null,
  headingFont: "bricolage",
  bodyFont: "instrument",
  titleSize: "l",
  logoPosition: "left",
  logoSize: "m",
  showBrandName: true,
  align: "left",
  introLayout: "stack",
  showMeta: true,
  corners: "rounded",
  optionStyle: "outline",
  progress: "bar",
  background: "plain",
  footerText: "",
  showPoweredBy: true,
};

export const resolveDesign = (partial?: Partial<QuizDesign> | null): QuizDesign => ({ ...DEFAULT_DESIGN, ...(partial ?? {}) });

export interface Theme {
  id: QuizDesign["themeId"];
  label: string;
  bg: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
  dark: boolean;
}

export const THEMES: Theme[] = [
  { id: "classique", label: "Classique", bg: "#f4f5f7", surface: "#ffffff", text: "#121521", primary: "#151a2d", accent: "#f5a524", dark: false },
  { id: "epure", label: "Épuré", bg: "#ffffff", surface: "#ffffff", text: "#111111", primary: "#111111", accent: "#2563eb", dark: false },
  { id: "ocean", label: "Océan", bg: "#eaf4f7", surface: "#ffffff", text: "#0b2530", primary: "#0e6f8f", accent: "#19b3a6", dark: false },
  { id: "foret", label: "Forêt", bg: "#eef5ef", surface: "#ffffff", text: "#10241a", primary: "#1f6b45", accent: "#e0a820", dark: false },
  { id: "prune", label: "Prune", bg: "#f6f1fa", surface: "#ffffff", text: "#22132f", primary: "#5b2a86", accent: "#ff7a59", dark: false },
  { id: "sombre", label: "Sombre", bg: "#0f1220", surface: "#181c2e", text: "#f2f4fa", primary: "#f5a524", accent: "#f5a524", dark: true },
];

export interface FontOption {
  id: QuizDesign["headingFont"];
  label: string;
  /** Variable CSS déclarée par next/font dans le layout racine (absente pour la police système). */
  cssVar: string | null;
  kind: "sans" | "serif";
}

export const FONTS: FontOption[] = [
  { id: "instrument", label: "Instrument Sans", cssVar: "--font-instrument", kind: "sans" },
  { id: "bricolage", label: "Bricolage Grotesque", cssVar: "--font-bricolage", kind: "sans" },
  { id: "dm-sans", label: "DM Sans", cssVar: "--font-dm-sans", kind: "sans" },
  { id: "space-grotesk", label: "Space Grotesk", cssVar: "--font-space-grotesk", kind: "sans" },
  { id: "poppins", label: "Poppins", cssVar: "--font-poppins", kind: "sans" },
  { id: "lora", label: "Lora", cssVar: "--font-lora", kind: "serif" },
  { id: "fraunces", label: "Fraunces", cssVar: "--font-fraunces", kind: "serif" },
  { id: "playfair", label: "Playfair Display", cssVar: "--font-playfair", kind: "serif" },
  { id: "system", label: "Police du système", cssVar: null, kind: "sans" },
];

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';

export function fontStack(id: QuizDesign["headingFont"]): string {
  const f = FONTS.find((x) => x.id === id) ?? FONTS[0]!;
  return `${f.cssVar ? `var(${f.cssVar}), ` : ""}${f.kind === "serif" ? SERIF : SANS}`;
}

export const LOGO_PX = { s: 28, m: 40, l: 64 } as const;
export const TITLE_CLASS = { m: "text-2xl sm:text-3xl", l: "text-3xl sm:text-4xl", xl: "text-4xl sm:text-5xl" } as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string | null | undefined): v is string => !!v && HEX.test(v);

/** Luminance relative (0 = noir, 1 = blanc) d'une couleur #rrggbb. */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

export const readableOn = (bg: string) => (luminance(bg) > 0.4 ? "#111827" : "#ffffff");

export interface ResolvedPalette {
  bg: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
  onPrimary: string;
  dark: boolean;
}

export function palette(design: QuizDesign): ResolvedPalette {
  const theme = THEMES.find((t) => t.id === design.themeId) ?? THEMES[0]!;
  const bg = isHex(design.backgroundColor) ? design.backgroundColor : theme.bg;
  const dark = isHex(design.backgroundColor) ? luminance(bg) < 0.4 : theme.dark;
  const text = isHex(design.backgroundColor) ? (dark ? "#f2f4fa" : "#121521") : theme.text;
  const surface = isHex(design.backgroundColor) ? (dark ? `color-mix(in srgb, ${bg} 88%, white)` : "#ffffff") : theme.surface;
  const primary = isHex(design.primaryColor) ? design.primaryColor : theme.primary;
  const accent = isHex(design.accentColor) ? design.accentColor : theme.accent;
  return { bg, surface, text, primary, accent, onPrimary: readableOn(primary), dark };
}

const RADII = { sharp: ["0.125rem", "0.25rem", "0.25rem"], rounded: ["0.5rem", "0.75rem", "1rem"], soft: ["1rem", "1.5rem", "2rem"] } as const;

/** Variables CSS à poser sur le conteneur du quiz : elles surchargent les jetons de l'application. */
export function designStyle(design: QuizDesign): CSSProperties {
  const p = palette(design);
  const [lg, xl, x2] = RADII[design.corners];
  const vars: Record<string, string> = {
    "--background": p.bg,
    "--foreground": p.text,
    "--card": p.surface,
    "--muted": `color-mix(in srgb, ${p.text} 8%, ${p.bg})`,
    "--muted-foreground": `color-mix(in srgb, ${p.text} 64%, ${p.bg})`,
    "--border": `color-mix(in srgb, ${p.text} 16%, ${p.bg})`,
    "--input": `color-mix(in srgb, ${p.text} 26%, ${p.bg})`,
    "--primary": p.primary,
    "--primary-hover": `color-mix(in srgb, ${p.primary} 86%, ${p.text})`,
    "--primary-foreground": p.onPrimary,
    "--accent": p.accent,
    "--accent-soft": `color-mix(in srgb, ${p.accent} 20%, ${p.bg})`,
    "--accent-soft-foreground": p.text,
    "--ring": p.primary,
    "--radius-md": lg,
    "--radius-lg": lg,
    "--radius-xl": xl,
    "--radius-2xl": x2,
    "--font-body": fontStack(design.bodyFont),
    "--font-heading": fontStack(design.headingFont),
  };
  const style: Record<string, string> = { ...vars, backgroundColor: p.bg, color: p.text, fontFamily: "var(--font-body)" };
  if (design.background === "gradient") style.backgroundImage = `radial-gradient(70rem 32rem at 50% -8%, color-mix(in srgb, ${p.accent} 24%, transparent), transparent)`;
  if (design.background === "dots") { style.backgroundImage = `radial-gradient(color-mix(in srgb, ${p.text} 16%, transparent) 1px, transparent 1px)`; style.backgroundSize = "20px 20px"; }
  return style as CSSProperties;
}

/** La marque Leadora est obligatoire sur l'offre gratuite (PRD §15) ; facultative au-dessus. */
export const shouldShowPoweredBy = (design: QuizDesign, plan: PlanId) => plan === "free" || design.showPoweredBy;
