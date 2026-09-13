import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export type Quality = "HIGH" | "MEDIUM" | "LOW" | "FALLBACK";

function detectWeb(): Quality {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return "FALLBACK";
    const mem = (navigator as any).deviceMemory as number | undefined;
    const cores = navigator.hardwareConcurrency || 4;
    if ((mem && mem <= 2) || cores <= 2) return "LOW";
    if ((mem && mem <= 4) || cores <= 4) return "MEDIUM";
    return "HIGH";
  } catch {
    return "FALLBACK";
  }
}

/** Device capability tiers for the 3D system. Respects reduced-motion and (where available) battery saver. */
export function useQuality(): { quality: Quality; reducedMotion: boolean; setQuality: (q: Quality) => void } {
  const [quality, setQuality] = useState<Quality>(() => (Platform.OS === "web" ? detectWeb() : "MEDIUM"));
  const [reducedMotion, setRM] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setRM).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setRM);
    if (Platform.OS === "web" && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((b: any) => {
        if (!b.charging && b.level < 0.2) setQuality((q) => (q === "HIGH" ? "MEDIUM" : q === "MEDIUM" ? "LOW" : q));
      }).catch(() => {});
    }
    return () => sub?.remove?.();
  }, []);
  return { quality, reducedMotion, setQuality };
}

export const DPR: Record<Quality, number> = { HIGH: 2, MEDIUM: 1.5, LOW: 1, FALLBACK: 1 };
