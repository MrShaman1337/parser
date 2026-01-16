import { useEffect, useMemo, useState } from "react";

export type ShaderQuality = "low" | "medium" | "high";

export type QualityConfig = {
  maxDpr: number;
  fps: number;
  octaves: number;
  glow: number;
  mouseStrength: number;
  antialias: boolean;
};

export const QUALITY_PRESETS: Record<ShaderQuality, QualityConfig> = {
  low: { maxDpr: 1.0, fps: 20, octaves: 2, glow: 0.6, mouseStrength: 0.05, antialias: false },
  medium: { maxDpr: 1.25, fps: 30, octaves: 3, glow: 0.9, mouseStrength: 0.1, antialias: false },
  high: { maxDpr: 1.5, fps: 45, octaves: 4, glow: 1.0, mouseStrength: 0.15, antialias: true }
};

const isLowEndDevice = () => {
  if (typeof navigator === "undefined") return false;
  const memory = (navigator as any).deviceMemory || 0;
  const cores = navigator.hardwareConcurrency || 0;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  return isMobile || (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
};

export const useShaderQuality = (requested?: ShaderQuality) => {
  const [lowEnd, setLowEnd] = useState(false);
  const baseQuality = requested || "medium";

  useEffect(() => {
    setLowEnd(isLowEndDevice());
  }, []);

  const effectiveQuality = useMemo<ShaderQuality>(() => {
    if (lowEnd && baseQuality !== "low") return "low";
    return baseQuality;
  }, [lowEnd, baseQuality]);

  return {
    quality: effectiveQuality,
    config: QUALITY_PRESETS[effectiveQuality],
    lowEnd
  };
};
