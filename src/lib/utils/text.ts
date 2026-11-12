/** Transforme un texte en identifiant d'URL : « Mon quiz financier ! » → « mon-quiz-financier ». */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function initials(first: string, last = ""): string {
  return `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase() || "?";
}

/** Retire toute balise HTML : les contenus saisis sont affichés comme du texte (React échappe déjà) et stockés propres. */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
