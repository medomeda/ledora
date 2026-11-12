import { afterEach, describe, expect, it } from "vitest";
import { getFeatures } from "@/lib/features";

describe("drapeaux de fonctionnalités", () => {
  afterEach(() => {
    delete process.env.LEADORA_FEATURE_AI;
    delete process.env.LEADORA_FEATURE_ASSISTANT;
    delete process.env.LEADORA_FEATURE_PUBLICATIONS;
  });

  it("par défaut : IA du workflow active, module Assistant et Publications au chaud", () => {
    expect(getFeatures()).toEqual({ publications: false, ai: true, assistant: false });
  });

  it("se règlent par variable d'environnement", () => {
    process.env.LEADORA_FEATURE_AI = "0";
    process.env.LEADORA_FEATURE_ASSISTANT = "1";
    process.env.LEADORA_FEATURE_PUBLICATIONS = "1";
    expect(getFeatures()).toEqual({ publications: true, ai: false, assistant: true });
  });
});
