import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type ZoneKey = "bathroom" | "walls" | "ceiling" | "floor" | "doors" | "windows" | "interior" | "exterior";

export const ZONE_LABEL: Record<ZoneKey, string> = {
  bathroom: "Badezimmer", walls: "Wände", ceiling: "Decke", floor: "Boden", doors: "Türen", windows: "Fenster", interior: "Innenraum", exterior: "Außenbereich",
};

const PALETTE = { wall: "#F3F0E8", wallDark: "#E4DFD3", roof: "#161616", ground: "#D9CFBF", glass: "#8FB3C7", door: "#2A2622", accent: "#D96C40", floor: "#C9B79A", bath: "#DCE7EA" };

type PartProps = { zone: ZoneKey; position: [number, number, number]; size: [number, number, number]; color: string; selected?: ZoneKey | null; onSelect?: (z: ZoneKey) => void; highlight?: string | null; opacity?: number; castShadow?: boolean };

function Part({ zone, position, size, color, selected, onSelect, highlight, opacity = 1, castShadow = true }: PartProps) {
  const ref = useRef<THREE.Mesh>(null);
  const isSel = selected === zone;
  const target = useMemo(() => new THREE.Color(highlight || (isSel ? PALETTE.accent : color)), [highlight, isSel, color]);
  useFrame(() => {
    const m = ref.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.color.lerp(target, 0.12);
  });
  return (
    <mesh
      ref={ref}
      position={position}
      castShadow={castShadow}
      receiveShadow
      onClick={(e: any) => { e.stopPropagation?.(); onSelect?.(zone); }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

/** Stylised two-storey architectural house built from primitives. `zoneColors` allows status colouring (Projekt 3D). */
export function House({ selected, onSelect, zoneColors, interactive = true, cutaway = false }: { selected?: ZoneKey | null; onSelect?: (z: ZoneKey) => void; zoneColors?: Partial<Record<ZoneKey, string>>; interactive?: boolean; cutaway?: boolean }) {
  const sel = interactive ? onSelect : undefined;
  const hc = (z: ZoneKey) => zoneColors?.[z] ?? null;
  const wallOpacity = cutaway ? 0.35 : 1;
  return (
    <group position={[0, 0, 0]}>
      {/* ground plate */}
      <mesh position={[0, -0.05, 0]} receiveShadow onClick={(e: any) => { e.stopPropagation?.(); sel?.("exterior"); }}>
        <boxGeometry args={[10, 0.1, 9]} />
        <meshStandardMaterial color={hc("exterior") || (selected === "exterior" ? PALETTE.accent : PALETTE.ground)} roughness={1} />
      </mesh>
      {/* floor slab ground floor */}
      <Part zone="floor" position={[0, 0.08, 0]} size={[5.2, 0.16, 4.2]} color={PALETTE.floor} selected={selected} onSelect={sel} highlight={hc("floor")} />
      {/* walls ground floor (four thin slabs) */}
      <Part zone="walls" position={[0, 1.35, -2.05]} size={[5.2, 2.5, 0.12]} color={PALETTE.wall} selected={selected} onSelect={sel} highlight={hc("walls")} opacity={wallOpacity} />
      <Part zone="walls" position={[-2.55, 1.35, 0]} size={[0.12, 2.5, 4.2]} color={PALETTE.wallDark} selected={selected} onSelect={sel} highlight={hc("walls")} opacity={wallOpacity} />
      <Part zone="walls" position={[2.55, 1.35, 0]} size={[0.12, 2.5, 4.2]} color={PALETTE.wall} selected={selected} onSelect={sel} highlight={hc("walls")} opacity={wallOpacity} />
      <Part zone="walls" position={[-1.2, 1.35, 2.05]} size={[2.8, 2.5, 0.12]} color={PALETTE.wall} selected={selected} onSelect={sel} highlight={hc("walls")} opacity={wallOpacity} />
      {/* door */}
      <Part zone="doors" position={[1.1, 1.05, 2.08]} size={[0.9, 2.1, 0.1]} color={PALETTE.door} selected={selected} onSelect={sel} highlight={hc("doors")} />
      {/* ground floor glazing */}
      <Part zone="windows" position={[2.05, 1.3, 2.08]} size={[0.9, 1.6, 0.06]} color={PALETTE.glass} selected={selected} onSelect={sel} highlight={hc("windows")} castShadow={false} />
      <Part zone="windows" position={[2.57, 1.3, -0.6]} size={[0.06, 1.6, 2.0]} color={PALETTE.glass} selected={selected} onSelect={sel} highlight={hc("windows")} castShadow={false} />
      {/* bathroom volume inside */}
      <Part zone="bathroom" position={[-1.6, 0.9, -1.1]} size={[1.7, 1.6, 1.6]} color={PALETTE.bath} selected={selected} onSelect={sel} highlight={hc("bathroom")} />
      {/* interior (living block) */}
      <Part zone="interior" position={[0.9, 0.5, -0.5]} size={[1.8, 0.7, 1.2]} color={"#C8BFB0"} selected={selected} onSelect={sel} highlight={hc("interior")} />
      {/* ceiling / upper slab */}
      <Part zone="ceiling" position={[0, 2.66, 0]} size={[5.4, 0.16, 4.4]} color={PALETTE.wallDark} selected={selected} onSelect={sel} highlight={hc("ceiling")} />
      {/* upper floor (offset volume) */}
      <Part zone="walls" position={[-0.6, 3.9, -0.3]} size={[4.0, 2.3, 3.4]} color={PALETTE.wall} selected={selected} onSelect={sel} highlight={hc("walls")} opacity={wallOpacity} />
      <Part zone="windows" position={[-0.6, 3.9, 1.42]} size={[2.6, 1.3, 0.06]} color={PALETTE.glass} selected={selected} onSelect={sel} highlight={hc("windows")} castShadow={false} />
      {/* roof */}
      <Part zone="ceiling" position={[-0.6, 5.13, -0.3]} size={[4.3, 0.16, 3.7]} color={PALETTE.roof} selected={selected} onSelect={sel} highlight={hc("ceiling")} />
      {/* terrace */}
      <mesh position={[1.9, 2.8, -0.3]} receiveShadow>
        <boxGeometry args={[1.4, 0.06, 3.4]} />
        <meshStandardMaterial color={PALETTE.floor} roughness={1} />
      </mesh>
      {/* tree-like accent */}
      <mesh position={[3.9, 0.9, 2.6]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1.8, 8]} />
        <meshStandardMaterial color={"#4A3F35"} />
      </mesh>
      <mesh position={[3.9, 2.1, 2.6]} castShadow>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial color={"#6F7F63"} roughness={1} />
      </mesh>
    </group>
  );
}

export function Lights({ quality }: { quality: "HIGH" | "MEDIUM" | "LOW" }) {
  return (
    <>
      <hemisphereLight args={["#FFF7EA", "#B9AE9C", 0.85]} />
      <directionalLight position={[6, 9, 4]} intensity={1.6} castShadow={quality !== "LOW"} shadow-mapSize-width={quality === "HIGH" ? 2048 : 1024} shadow-mapSize-height={quality === "HIGH" ? 2048 : 1024} shadow-bias={-0.0005} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#FFE2C8" />
    </>
  );
}

/** Cinematic camera rig: slow orbit + pointer parallax + external scroll offset. */
export function CameraRig({ autoRotate = true, scroll = 0, radius = 10, height = 4.6, target = [0, 1.4, 0] as [number, number, number] }: { autoRotate?: boolean; scroll?: number; radius?: number; height?: number; target?: [number, number, number] }) {
  const t = useRef(0);
  const vec = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    if (autoRotate) t.current += delta * 0.12;
    const px = state.pointer.x * 0.35;
    const py = state.pointer.y * 0.25;
    const angle = t.current + px + 0.6 + scroll * 0.6;
    vec.set(Math.sin(angle) * radius, height + py * 1.2 - scroll * 1.5, Math.cos(angle) * radius);
    state.camera.position.lerp(vec, 0.06);
    state.camera.lookAt(target[0], target[1], target[2]);
  });
  return null;
}
