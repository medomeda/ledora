import { describe, expect, it } from "vitest";
import { authenticate, createBootstrapAdmin, isResetTokenValid, issueResetToken, register, updateProfile } from "@/services/auth.service";
import { makeWorld } from "@/tests/helpers";
import { emptyState } from "@/server/db/store";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, passwordSchema, registerSchema } from "@/lib/validations";

describe("authentification", () => {
  it("inscrit un utilisateur avec son espace et refuse les doublons d'email", () => {
    const s = emptyState();
    const r = register(s, { firstName: "Léa", lastName: "Martin", email: " LEA@Example.com ", password: "Motdepasse1" });
    expect(r.user.email).toBe("lea@example.com");
    expect(s.businesses).toHaveLength(1);
    expect(s.businesses[0]!.ownerId).toBe(r.user.id);
    expect(() => register(s, { firstName: "X", lastName: "Y", email: "lea@example.com", password: "Motdepasse1" })).toThrow(/existe déjà/);
  });

  it("ne stocke jamais le mot de passe en clair et vérifie l'authentification", () => {
    const w = makeWorld();
    expect(JSON.stringify(w.s)).not.toContain("Motdepasse1");
    expect(authenticate(w.s, "OWNER@test.dev", "Motdepasse1")?.id).toBe(w.user.id);
    expect(authenticate(w.s, "owner@test.dev", "mauvais")).toBeNull();
    expect(authenticate(w.s, "inconnu@test.dev", "Motdepasse1")).toBeNull();
    expect(verifyPassword("x", hashPassword("x"))).toBe(true);
    expect(verifyPassword("y", hashPassword("x"))).toBe(false);
  });

  it("émet un jeton de réinitialisation au format Better Auth, unique par utilisateur, qui expire", () => {
    const w = makeWorld();
    const now = new Date();
    const token = issueResetToken(w.s, w.user.id, 3600_000, now);
    expect(w.s.verifications[0]).toMatchObject({ identifier: `reset-password:${token}`, value: w.user.id });
    expect(isResetTokenValid(w.s, token, now)).toBe(true);
    expect(isResetTokenValid(w.s, token, new Date(now.getTime() + 2 * 3600_000))).toBe(false);
    expect(isResetTokenValid(w.s, "inconnu", now)).toBe(false);
    const second = issueResetToken(w.s, w.user.id, 3600_000, now);
    expect(w.s.verifications).toHaveLength(1); // le précédent est remplacé
    expect(isResetTokenValid(w.s, token, now)).toBe(false);
    expect(isResetTokenValid(w.s, second, now)).toBe(true);
  });

  it("crée le compte de connexion « credential » et tient le nom à jour", () => {
    const s = emptyState();
    const r = register(s, { firstName: "A", lastName: "B", email: "a@b.dev", password: "Motdepasse1" });
    expect(s.accounts).toHaveLength(1);
    expect(s.accounts[0]).toMatchObject({ providerId: "credential", accountId: r.user.id, userId: r.user.id });
    expect(r.user).toMatchObject({ name: "A B", emailVerified: false });
    updateProfile(s, r.user.id, { firstName: "Alice", lastName: "Durand" });
    expect(s.users[0]!.name).toBe("Alice Durand");
  });

  it("crée le premier administrateur d'un déploiement (sans espace client, adresse confirmée) et refuse un doublon", () => {
    const s2 = emptyState();
    const admin = createBootstrapAdmin(s2, { email: " Admin@Exemple.com ", password: "mot-de-passe-12+", name: "Aïcha Diallo" });
    expect(admin).toMatchObject({ email: "admin@exemple.com", role: "admin", emailVerified: true, firstName: "Aïcha", lastName: "Diallo", name: "Aïcha Diallo" });
    expect(s2.businesses).toHaveLength(0);
    expect(authenticate(s2, "admin@exemple.com", "mot-de-passe-12+")?.role).toBe("admin");
    expect(() => createBootstrapAdmin(s2, { email: "admin@exemple.com", password: "autre-mot-de-passe", name: "X" })).toThrow(/existe déjà/);
  });

  it("valide les formulaires avec Zod", () => {
    expect(passwordSchema.safeParse("court1").success).toBe(false);
    expect(passwordSchema.safeParse("sansChiffreee").success).toBe(false);
    expect(passwordSchema.safeParse("Valide123").success).toBe(true);
    expect(registerSchema.safeParse({ firstName: "", lastName: "X", email: "pas-un-email", password: "Valide123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "A@B.dev", password: "x" }).data?.email).toBe("a@b.dev");
  });
});
