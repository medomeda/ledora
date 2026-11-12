/** URL publique du site (SEO : canonical, sitemap, Open Graph). À définir en production via NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Leadora";
export const SITE_TAGLINE = "Quiz marketing qui qualifient vos prospects";
