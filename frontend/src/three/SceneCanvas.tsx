import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Canvas } from "@react-three/fiber";

export type SceneCanvasProps = { children: React.ReactNode; style?: StyleProp<ViewStyle>; dpr?: number; shadows?: boolean; camera?: { position: [number, number, number]; fov?: number }; background?: string; transparent?: boolean };

export default function SceneCanvas({ children, style, dpr = 1.5, shadows, camera, background, transparent }: SceneCanvasProps) {
  return (
    <div style={{ width: "100%", height: "100%", ...(style as any), background: transparent ? "transparent" : background }}>
      <Canvas dpr={dpr} shadows={shadows} camera={camera || { position: [7, 4.5, 8], fov: 42 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ width: "100%", height: "100%" }}>
        {children}
      </Canvas>
    </div>
  );
}
