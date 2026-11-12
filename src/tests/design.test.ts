import { describe, expect, it } from "vitest";
import { quizConfigSchema } from "@/lib/validations";
import { DEFAULT_DESIGN, designStyle, fontStack, isHex, luminance, palette, readableOn, resolveDesign, shouldShowPoweredBy, THEMES } from "@/lib/quiz/design";
import { createQuiz, getPublicQuiz, publishQuiz, saveQuizConfig } from "@/services/quiz.service";
import { makeWorld, sampleConfig } from "@/tests/helpers";

describe("design du quiz", () => {
  it("un quiz sans design utilise les valeurs par défaut (compatibilité)", () => {
    expect(resolveDesign(undefined)).toEqual(DEFAULT_DESIGN);
    expect(resolveDesign({ themeId: "sombre", align: "center" })).toMatchObject({ themeId: "sombre", align: "center", corners: "rounded" });
    expect(quizConfigSchema.safeParse(sampleConfig()).success).toBe(true);
  });

  it("chaque thème produit des variables CSS complètes et lisibles", () => {
    for (const t of THEMES) {
      const style = designStyle(resolveDesign({ themeId: t.id })) as Record<string, string>;
      for (const k of ["--background", "--foreground", "--card", "--primary", "--primary-foreground", "--accent", "--border"]) expect(style[k], `${t.id} ${k}`).toBeTruthy();
      expect(style["--font-heading"]).toContain("var(--font-bricolage)");
      const p = palette(resolveDesign({ themeId: t.id }));
      // Contraste texte/fond et texte du bouton/couleur principale : écart de luminance suffisant.
      expect(Math.abs(luminance(p.text) - luminance(p.bg))).toBeGreaterThan(0.5);
      expect(Math.abs(luminance(p.onPrimary) - luminance(p.primary))).toBeGreaterThan(0.4);
    }
  });

  it("un fond personnalisé sombre inverse automatiquement le texte", () => {
    const dark = palette(resolveDesign({ backgroundColor: "#101010" }));
    const light = palette(resolveDesign({ backgroundColor: "#fafafa" }));
    expect(dark.dark).toBe(true);
    expect(luminance(dark.text)).toBeGreaterThan(0.6);
    expect(luminance(light.text)).toBeLessThan(0.2);
    expect(readableOn("#ffffff")).toBe("#111827");
    expect(readableOn("#000000")).toBe("#ffffff");
  });

  it("polices : pile CSS avec repli, police système sans variable", () => {
    expect(fontStack("fraunces")).toContain("var(--font-fraunces)");
    expect(fontStack("fraunces")).toContain("serif");
    expect(fontStack("system")).not.toContain("var(");
  });

  it("la mention Leadora est obligatoire sur l'offre gratuite", () => {
    expect(shouldShowPoweredBy(resolveDesign({ showPoweredBy: false }), "free")).toBe(true);
    expect(shouldShowPoweredBy(resolveDesign({ showPoweredBy: false }), "starter")).toBe(false);
    expect(shouldShowPoweredBy(resolveDesign({ showPoweredBy: true }), "pro")).toBe(true);
  });

  it("valide les couleurs et les choix, refuse les valeurs hors liste", () => {
    expect(isHex("#12abEF")).toBe(true);
    expect(isHex("red")).toBe(false);
    const ok = { ...sampleConfig(), design: { themeId: "ocean" as const, primaryColor: "#112233" } };
    expect(quizConfigSchema.safeParse(ok).success).toBe(true);
    expect(quizConfigSchema.safeParse({ ...sampleConfig(), design: { primaryColor: "rouge" } }).success).toBe(false);
    expect(quizConfigSchema.safeParse({ ...sampleConfig(), design: { themeId: "inconnu" } }).success).toBe(false);
    expect(quizConfigSchema.safeParse({ ...sampleConfig(), design: { footerText: "x".repeat(201) } }).success).toBe(false);
  });

  it("le design est figé à la publication avec la version, et nettoyé du HTML", () => {
    const w = makeWorld();
    const quiz = createQuiz(w.s, w.ctx, { title: "Design", config: sampleConfig() });
    const cfg = structuredClone(quiz.config);
    cfg.design = { themeId: "foret", footerText: "Mentions <b>légales</b>" };
    saveQuizConfig(w.s, w.ctx, quiz.id, cfg);
    publishQuiz(w.s, w.ctx, quiz.id);
    expect(getPublicQuiz(w.s, quiz.slug)!.config.design).toMatchObject({ themeId: "foret", footerText: "Mentions légales" });
    expect(getPublicQuiz(w.s, quiz.slug)!.plan).toBe("free");
    // Modifier le design sans republier ne change pas ce que voit le public.
    const next = structuredClone(cfg);
    next.design = { themeId: "sombre" };
    saveQuizConfig(w.s, w.ctx, quiz.id, next);
    expect(getPublicQuiz(w.s, quiz.slug)!.config.design?.themeId).toBe("foret");
  });
});
