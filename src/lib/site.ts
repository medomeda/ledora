/**
 * URL publique du site (SEO : canonical, sitemap, Open Graph). Lue à l'exécution (et non figée à la compilation) :
 * SITE_URL, sinon BETTER_AUTH_URL (même adresse publique), sinon NEXT_PUBLIC_SITE_URL.
 */
export const siteUrl = (): string => (process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3300").replace(/\/$/, "");
export const SITE_NAME = "Leadora";
export const SITE_TAGLINE = "Quiz marketing qui qualifient vos prospects";
