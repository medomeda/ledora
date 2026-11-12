import type { UserRole } from "@/types/domain";

/**
 * Équipe de la plateforme : trois rôles, des permissions explicites. Toute vérification passe par `can()` :
 * ajouter un rôle ou une permission ne touche que ce fichier (et les écrans qui affichent l'action).
 */
export type Permission =
  | "view" // consulter l'administration
  | "account.support" // suspendre/réactiver, confirmer l'email, lien de réinitialisation, déconnecter
  | "account.billing" // changer l'offre d'un compte
  | "account.delete" // supprimer définitivement un compte
  | "quiz.moderate" // dépublier/archiver un quiz
  | "plans.configure" // quotas et prix des offres
  | "settings.manage" // inscriptions, annonce
  | "team.manage"; // inviter, changer le rôle, désactiver, retirer un collaborateur

export type StaffRole = Exclude<UserRole, "user">;
export const STAFF_ROLES: StaffRole[] = ["admin", "support", "readonly"];

export const STAFF_ROLE_INFO: Record<StaffRole, { label: string; description: string; permissions: Permission[] }> = {
  admin: { label: "Administrateur", description: "Accès complet : offres, réglages, suppression de comptes et gestion de l'équipe.", permissions: ["view", "account.support", "account.billing", "account.delete", "quiz.moderate", "plans.configure", "settings.manage", "team.manage"] },
  support: { label: "Support", description: "Aide les clients : suspension, confirmation d'email, réinitialisation, modération des quiz. Ne touche ni aux offres ni aux réglages.", permissions: ["view", "account.support", "quiz.moderate"] },
  readonly: { label: "Lecture seule", description: "Consulte tout, ne modifie rien.", permissions: ["view"] },
};

export const isStaff = (role: UserRole): role is StaffRole => role !== "user";
export const can = (role: UserRole, permission: Permission): boolean => isStaff(role) && STAFF_ROLE_INFO[role].permissions.includes(permission);
export const permissionsOf = (role: UserRole): Permission[] => (isStaff(role) ? STAFF_ROLE_INFO[role].permissions : []);
