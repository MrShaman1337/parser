import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import vertexShader from "./shaders/vertex.glsl?raw";
import fragmentShader from "./shaders/fragment.glsl?raw";

type Quality = "low" | "medium" | "high";

type Props = {
  className?: string;
  intensity?: number;
  speed?: number;
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  interactiveMouse?: boolean;
  paused?: boolean;
  quality?: Quality;
};

type ShaderPlaneProps = Omit<Required<Props>, "className">;

const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
};

const QualitySettings: Record<Quality, { dpr: number; fps: number | null }> = {
  low: { dpr: 1, fps: 30 },
  medium: { dpr: 1.5, fps: 60 },
  high: { dpr: 2, fps: null }
};

const ShaderPlane = ({
  intensity,
  speed,
  colorA,
  colorB,
  interactiveMouse,
  paused,
  quality
}: ShaderPlaneProps) => {
  const { size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const lastFrameRef = useRef(0);
  const config = QualitySettings[quality];

  useEffect(() => {
    const handleMouse = (event: MouseEvent | TouchEvent) => {
      if (!interactiveMouse) return;
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
    if (!materialRef.current) return;
    materialRef.current.uniforms.u_resolution.value.set(size.width, size.height);
  }, [size]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material || paused) return;
    const now = performance.now();
    if (config.fps) {
      const interval = 1000 / config.fps;
      if (now - lastFrameRef.current < interval) return;
      lastFrameRef.current = now;
    }
    material.uniforms.u_time.value += delta * speed;
    material.uniforms.u_mouse.value.copy(mouseRef.current);
  });

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_intensity: { value: intensity },
      u_colorA: { value: new THREE.Color(...colorA) },
      u_colorB: { value: new THREE.Color(...colorB) }
    }),
    [intensity, colorA, colorB, size.width, size.height]
  );

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} fragmentShader={fragmentShader} vertexShader={vertexShader} uniforms={uniforms} />
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
  quality = "high"
}: Props) => {
  const [webglReady, setWebglReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const config = QualitySettings[quality];

  useEffect(() => {
    setWebglReady(isWebGLAvailable());
  }, []);

  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  if (!webglReady) {
    return <div className={`fixed inset-0 -z-10 gradient-fallback ${className || ""}`} />;
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className || ""}`}>
      <Canvas
        dpr={Math.min(config.dpr, 2)}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="always"
      >
        <ShaderPlane
          intensity={intensity}
          speed={speed}
          colorA={colorA}
          colorB={colorB}
          interactiveMouse={interactiveMouse}
          paused={paused || hidden}
          quality={quality}
        />
      </Canvas>
    </div>
  );
};

export default AnimatedShaderBackground;
