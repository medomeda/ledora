import { afterEach, describe, expect, it } from "vitest";
import { getFeatures } from "@/lib/features";

describe("modules au chaud", () => {
  afterEach(() => {
    delete process.env.LEADORA_FEATURE_AI;
    delete process.env.LEADORA_FEATURE_PUBLICATIONS;
  });

  it("Publications et Assistant IA sont désactivés par défaut", () => {
    expect(getFeatures()).toEqual({ publications: false, ai: false });
  });

  it("se réactivent par variable d'environnement", () => {
    process.env.LEADORA_FEATURE_AI = "1";
    process.env.LEADORA_FEATURE_PUBLICATIONS = "1";
    expect(getFeatures()).toEqual({ publications: true, ai: true });
  });
});
