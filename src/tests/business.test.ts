import { describe, expect, it } from "vitest";
import { businessInfoSchema, offersSchema } from "@/lib/validations";
import { updateBusiness, updateOffers } from "@/services/business.service";
import { makeWorld } from "@/tests/helpers";

describe("Mon Business : informations et offres séparées", () => {
  const info = { name: "Aïcha Coaching", activityType: "coaching" as const, industry: "Finance", description: "Desc", managerName: "Aïcha", contactEmail: "a@b.dev", website: "", whatsapp: "", bookingUrl: "" };

  it("enregistrer les informations ne modifie pas les offres", () => {
    const w = makeWorld();
    updateOffers(w.s, w.ctx, ["Programme A", "  ", "<b>Programme B</b>"]);
    expect(w.business.offers).toEqual(["Programme A", "Programme B"]);
    updateBusiness(w.s, w.ctx, info);
    expect(w.s.businesses[0]!.name).toBe("Aïcha Coaching");
    expect(w.s.businesses[0]!.offers).toEqual(["Programme A", "Programme B"]);
  });

  it("enregistrer les offres ne modifie pas les informations", () => {
    const w = makeWorld();
    updateBusiness(w.s, w.ctx, info);
    updateOffers(w.s, w.ctx, ["Offre unique"]);
    expect(w.s.businesses[0]!.name).toBe("Aïcha Coaching");
    expect(w.s.businesses[0]!.description).toBe("Desc");
  });

  it("valide chaque formulaire avec son propre schéma", () => {
    expect(businessInfoSchema.safeParse(info).success).toBe(true);
    expect("offers" in businessInfoSchema.shape).toBe(false);
    expect(offersSchema.safeParse({ offers: Array(11).fill("x") }).success).toBe(false);
    expect(offersSchema.safeParse({ offers: ["Une offre"] }).success).toBe(true);
  });
});
