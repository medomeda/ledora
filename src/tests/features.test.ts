import { afterEach, describe, expect, it } from "vitest";
import { canResetDemo, DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoMode } from "@/lib/demo";
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

describe("mode test (démonstration)", () => {
  const set = (env: Record<string, string | undefined>) => { for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
  const save = { ...process.env };
  afterEach(() => { process.env = { ...save }; });

  it("est actif par défaut en développement et se coupe avec LEADORA_DEMO_MODE=0", () => {
    set({ NODE_ENV: "development", LEADORA_DEMO_MODE: undefined });
    expect(isDemoMode()).toBe(true);
    set({ LEADORA_DEMO_MODE: "0" });
    expect(isDemoMode()).toBe(false);
  });

  it("n'est actif en production que s'il est demandé explicitement", () => {
    set({ NODE_ENV: "production", LEADORA_DEMO_MODE: undefined });
    expect(isDemoMode()).toBe(false);
    set({ LEADORA_DEMO_MODE: "1" });
    expect(isDemoMode()).toBe(true);
  });

  it("n'autorise la remise à zéro qu'en mode test ET avec LEADORA_ALLOW_DEMO_RESET=1", () => {
    set({ NODE_ENV: "production", LEADORA_DEMO_MODE: "1", LEADORA_ALLOW_DEMO_RESET: undefined });
    expect(canResetDemo()).toBe(false);
    set({ LEADORA_ALLOW_DEMO_RESET: "1" });
    expect(canResetDemo()).toBe(true);
    set({ LEADORA_DEMO_MODE: "0" });
    expect(canResetDemo()).toBe(false);
  });

  it("liste des comptes fictifs cohérents avec le jeu de démonstration", () => {
    expect(DEMO_ACCOUNTS.map((a) => a.email)).toContain("admin@leadora.app");
    expect(DEMO_PASSWORD).toBe("Leadora2026");
  });
});
