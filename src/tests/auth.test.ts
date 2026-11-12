import { describe, expect, it } from "vitest";
import { authenticate, changePassword, isResetTokenValid, register, requestPasswordReset, resetPassword, verifyEmail } from "@/services/auth.service";
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

  it("réinitialise le mot de passe avec un jeton à usage unique qui expire", () => {
    const w = makeWorld();
    const now = new Date();
    const token = requestPasswordReset(w.s, "owner@test.dev", now)!;
    expect(requestPasswordReset(w.s, "inconnu@test.dev", now)).toBeNull();
    expect(isResetTokenValid(w.s, token, now)).toBe(true);
    w.s.sessions.push({ tokenHash: "t", userId: w.user.id, expiresAt: new Date(now.getTime() + 1e6).toISOString(), createdAt: now.toISOString() });
    resetPassword(w.s, token, "NouveauMdp2", now);
    expect(w.s.sessions).toHaveLength(0); // sessions révoquées
    expect(authenticate(w.s, "owner@test.dev", "NouveauMdp2")).not.toBeNull();
    expect(() => resetPassword(w.s, token, "EncoreUnAutre3", now)).toThrow(/invalide/);
    const expired = requestPasswordReset(w.s, "owner@test.dev", now)!;
    expect(() => resetPassword(w.s, expired, "Autre1234", new Date(now.getTime() + 2 * 3600 * 1000))).toThrow(/expiré/);
  });

  it("vérifie l'email et change le mot de passe", () => {
    const s = emptyState();
    const r = register(s, { firstName: "A", lastName: "B", email: "a@b.dev", password: "Motdepasse1" });
    expect(r.user.emailVerifiedAt).toBeNull();
    verifyEmail(s, r.verifyToken);
    expect(s.users[0]!.emailVerifiedAt).not.toBeNull();
    expect(() => changePassword(s, r.user.id, "faux", "Nouveau123", null)).toThrow(/incorrect/);
    changePassword(s, r.user.id, "Motdepasse1", "Nouveau123", null);
    expect(authenticate(s, "a@b.dev", "Nouveau123")).not.toBeNull();
  });

  it("valide les formulaires avec Zod", () => {
    expect(passwordSchema.safeParse("court1").success).toBe(false);
    expect(passwordSchema.safeParse("sansChiffreee").success).toBe(false);
    expect(passwordSchema.safeParse("Valide123").success).toBe(true);
    expect(registerSchema.safeParse({ firstName: "", lastName: "X", email: "pas-un-email", password: "Valide123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "A@B.dev", password: "x" }).data?.email).toBe("a@b.dev");
  });
});
