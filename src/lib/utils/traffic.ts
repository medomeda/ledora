import type { TrafficSource } from "@/types/domain";

/** Détermine la source de trafic à partir des paramètres UTM, sinon du référent (PRD §6.8). */
export function classifySource(utmSource?: string | null, referrer?: string | null): TrafficSource {
  const hay = `${utmSource ?? ""}`.toLowerCase().trim() || hostOf(referrer);
  if (!hay) return "direct";
  if (/facebook|fb\.|fb$|meta/.test(hay)) return "facebook";
  if (/instagram|^ig$|ig\./.test(hay)) return "instagram";
  if (/linkedin|lnkd/.test(hay)) return "linkedin";
  if (/whatsapp|wa\.me/.test(hay)) return "whatsapp";
  if (/mail|newsletter|sendinblue|brevo|mailchimp/.test(hay)) return "email";
  return "autre";
}

function hostOf(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
