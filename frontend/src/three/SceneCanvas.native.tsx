import React from "react";
import { View } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import type { SceneCanvasProps } from "./SceneCanvas";

export default function SceneCanvas({ children, style, dpr = 1.5, shadows, camera, background, transparent }: SceneCanvasProps) {
  return (
    <View style={[{ flex: 1, backgroundColor: transparent ? "transparent" : background }, style]}>
      <Canvas dpr={dpr} shadows={shadows} camera={camera || { position: [7, 4.5, 8], fov: 42 }} gl={{ antialias: true, alpha: true }} style={{ flex: 1 }}>
        {children}
      </Canvas>
    </View>
  );
}
