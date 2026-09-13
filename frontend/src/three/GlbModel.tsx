import React, { Suspense, useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type GlbProps = { url: string; zoneColors: Record<string, string>; selectedObject?: string | null; onSelectObject?: (name: string) => void; onObjects?: (names: string[]) => void };

function Model({ url, zoneColors, selectedObject, onSelectObject, onObjects }: GlbProps) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  useEffect(() => {
    const names: string[] = [];
    scene.traverse((o: any) => {
      if (o.isMesh) {
        names.push(o.name);
        o.castShadow = true;
        o.receiveShadow = true;
        if (!o.userData.__orig) o.userData.__orig = o.material;
      }
    });
    onObjects?.(names);
  }, [scene]);
  useEffect(() => {
    scene.traverse((o: any) => {
      if (!o.isMesh) return;
      const col = zoneColors[o.name];
      if (col || selectedObject === o.name) {
        const m = (o.userData.__orig as THREE.Material).clone() as THREE.MeshStandardMaterial;
        if ("color" in m) (m as any).color = new THREE.Color(selectedObject === o.name ? "#D96C40" : col);
        (m as any).emissive = new THREE.Color(selectedObject === o.name ? "#D96C40" : col || "#000");
        (m as any).emissiveIntensity = selectedObject === o.name ? 0.35 : 0.15;
        o.material = m;
      } else o.material = o.userData.__orig;
    });
  }, [scene, zoneColors, selectedObject]);
  return <primitive object={scene} onClick={(e: any) => { e.stopPropagation?.(); onSelectObject?.(e.object?.name); }} />;
}

export default function GlbModel(props: GlbProps) {
  return (
    <Suspense fallback={null}>
      <Model {...props} />
    </Suspense>
  );
}
