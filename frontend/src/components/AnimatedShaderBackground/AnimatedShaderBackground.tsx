import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import vertexShader from "./shaders/vertex.glsl?raw";
import fragmentShader from "./shaders/fragment.glsl?raw";
import { QUALITY_PRESETS, ShaderQuality, useShaderQuality } from "./useShaderQuality";
import { useHeroVisibility } from "./useVisibilityPause";

type Props = {
  className?: string;
  intensity?: number;
  speed?: number;
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  interactiveMouse?: boolean;
  paused?: boolean;
  quality?: ShaderQuality;
};

type ShaderPlaneProps = Omit<Required<Props>, "className" | "quality"> & {
  fps: number;
  octaves: number;
  glow: number;
  mouseStrength: number;
};

const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
};

const ShaderPlane = ({
  intensity,
  speed,
  colorA,
  colorB,
  interactiveMouse,
  paused,
  fps,
  octaves,
  glow,
  mouseStrength
}: ShaderPlaneProps) => {
  const { size, invalidate } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const lastTickRef = useRef(0);
  const mouseThrottleRef = useRef(0);
  const uniformsRef = useRef({
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(size.width, size.height) },
    u_mouse: { value: new THREE.Vector2(0, 0) },
    u_intensity: { value: intensity },
    u_colorA: { value: new THREE.Color(...colorA) },
    u_colorB: { value: new THREE.Color(...colorB) },
    u_octaves: { value: octaves },
    u_glow: { value: glow },
    u_mouseStrength: { value: mouseStrength }
  });

  useEffect(() => {
    const handleMouse = (event: MouseEvent | TouchEvent) => {
      if (!interactiveMouse) return;
      const now = performance.now();
      if (now - mouseThrottleRef.current < 33) return;
      mouseThrottleRef.current = now;
      const point = "touches" in event ? event.touches[0] : event;
      if (!point) return;
      mouseRef.current.set(point.clientX, size.height - point.clientY);
    };
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("touchmove", handleMouse, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleMouse);
    };
  }, [interactiveMouse, size.height]);

  useEffect(() => {
    uniformsRef.current.u_resolution.value.set(size.width, size.height);
  }, [size]);

  useEffect(() => {
    uniformsRef.current.u_intensity.value = intensity;
    uniformsRef.current.u_colorA.value.set(...colorA);
    uniformsRef.current.u_colorB.value.set(...colorB);
    uniformsRef.current.u_octaves.value = octaves;
    uniformsRef.current.u_glow.value = glow;
    uniformsRef.current.u_mouseStrength.value = mouseStrength;
  }, [intensity, colorA, colorB, octaves, glow, mouseStrength]);

  useEffect(() => {
    lastTickRef.current = performance.now();
  }, [paused]);

  useEffect(() => {
    let raf = 0;
    const interval = 1000 / fps;
    const loop = (time: number) => {
      if (!paused) {
        if (time - lastTickRef.current >= interval) {
          const delta = (time - lastTickRef.current) / 1000;
          lastTickRef.current = time;
          const material = materialRef.current;
          if (material) {
            material.uniforms.u_time.value += delta * speed;
            material.uniforms.u_mouse.value.copy(mouseRef.current);
          }
          invalidate();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, paused, speed, invalidate]);

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniformsRef.current}
      />
    </mesh>
  );
};

const AnimatedShaderBackground = ({
  className,
  intensity = 0.9,
  speed = 1,
  colorA = [0.06, 0.16, 0.25],
  colorB = [0.9, 0.4, 0.1],
  interactiveMouse = true,
  paused = false,
  quality = "medium"
}: Props) => {
  const [webglReady, setWebglReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const heroVisible = useHeroVisibility();
  const { quality: baseQuality, config, lowEnd } = useShaderQuality(quality);
  const effectiveQuality = heroVisible ? baseQuality : "low";
  const effectiveConfig = effectiveQuality === baseQuality ? config : QUALITY_PRESETS[effectiveQuality];
  const [dpr, setDpr] = useState(1);
  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return import.meta.env.DEV && new URLSearchParams(window.location.search).get("debugShader") === "1";
  }, []);

  useEffect(() => {
    setWebglReady(isWebGLAvailable());
  }, []);

  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDpr(Math.min(window.devicePixelRatio || 1, effectiveConfig.maxDpr));
  }, [effectiveConfig.maxDpr]);

  const isPaused = paused || hidden || reducedMotion;

  if (!webglReady) {
    return <div className={`fixed inset-0 -z-10 gradient-fallback ${className || ""}`} />;
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className || ""}`}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: effectiveConfig.antialias, powerPreference: "high-performance" }}
        frameloop="demand"
      >
        <ShaderPlane
          intensity={intensity}
          speed={speed}
          colorA={colorA}
          colorB={colorB}
          interactiveMouse={interactiveMouse}
          paused={isPaused}
          fps={effectiveConfig.fps}
          octaves={effectiveConfig.octaves}
          glow={effectiveConfig.glow}
          mouseStrength={effectiveConfig.mouseStrength}
        />
      </Canvas>
      {debugEnabled ? (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: "12px",
            padding: "0.5rem 0.7rem",
            borderRadius: "6px",
            zIndex: 50
          }}
        >
          <div>quality: {effectiveQuality}</div>
          <div>fps: {effectiveConfig.fps}</div>
          <div>dpr: {dpr.toFixed(2)}</div>
          <div>paused: {String(isPaused)}</div>
          <div>lowEnd: {String(lowEnd)}</div>
        </div>
      ) : null}
    </div>
  );
};

export default AnimatedShaderBackground;
