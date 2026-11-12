import "server-only";

/**
 * Envoi d'emails. Aucun fournisseur n'est encore branché : les messages sont consignés dans la console du serveur et gardés
 * en mémoire (« boîte d'envoi de développement ») pour que l'interface puisse afficher le lien à la place de l'email.
 * Brancher un fournisseur (SMTP, Resend…) = remplacer le corps de `deliver()`, rien d'autre ne change.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Lien d'action du message (réinitialisation, confirmation…). */
  link?: string;
  at: number;
}

const g = globalThis as typeof globalThis & { __leadoraOutbox?: Map<string, MailMessage> };
const outbox = (g.__leadoraOutbox ??= new Map());

/** Vrai tant qu'aucun fournisseur d'envoi réel n'est configuré : l'interface montre alors les liens à l'écran. */
export const mailIsSimulated = () => !process.env.MAIL_PROVIDER;

async function deliver(message: MailMessage): Promise<void> {
  // À remplacer par l'envoi réel (voir MAIL_PROVIDER dans .env.example).
  console.info(`[mail simulé] à ${message.to} : ${message.subject}${message.link ? ` — ${message.link}` : ""}`);
}

export async function sendMail(message: Omit<MailMessage, "at">): Promise<void> {
  const full = { ...message, at: Date.now() };
  outbox.set(message.to.toLowerCase(), full);
  await deliver(full);
}

/** Dernier message envoyé à une adresse, dans les 10 dernières minutes (affichage du lien en mode simulé). */
export function lastMailTo(to: string): MailMessage | null {
  const m = outbox.get(to.toLowerCase());
  return m && Date.now() - m.at < 10 * 60_000 ? m : null;
}
