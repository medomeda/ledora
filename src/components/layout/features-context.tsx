"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Features } from "@/lib/features";

const FeaturesContext = createContext<Features>({ publications: false, ai: false, assistant: false });

export function FeaturesProvider({ features, children }: { features: Features; children: ReactNode }) {
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export const useFeatures = () => useContext(FeaturesContext);
