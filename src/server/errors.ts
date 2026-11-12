/** Erreurs métier typées, traduites en messages utilisateur par les Server Actions et les routes publiques. */
export type AppErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INVALID_STATE" | "QUOTA" | "RATE_LIMIT";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (msg = "Vous n'avez pas les droits nécessaires pour cette action.") => new AppError("FORBIDDEN", msg);
/** Une ressource d'un autre espace est « introuvable » : on ne révèle jamais son existence. */
export const notFound = (msg = "Ressource introuvable.") => new AppError("NOT_FOUND", msg);
export const conflict = (msg: string, fieldErrors?: Record<string, string>) => new AppError("CONFLICT", msg, fieldErrors);
export const invalidState = (msg: string) => new AppError("INVALID_STATE", msg);
export const validation = (msg: string, fieldErrors?: Record<string, string>) => new AppError("VALIDATION", msg, fieldErrors);
export const quotaExceeded = (msg: string) => new AppError("QUOTA", msg);
