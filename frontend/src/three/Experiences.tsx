import React, { useState } from "react";
import { View, Pressable, useWindowDimensions, ScrollView } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import Slider from "./Slider";
import SceneCanvas from "./SceneCanvas";
import GlbModel from "./GlbModel";
import { House, Lights, CameraRig, ZoneKey, ZONE_LABEL } from "./House";
import { useQuality, DPR } from "./quality";
import { makeStyles, useTheme, space, radius, STATUS_COLOR_KEY } from "@/src/theme";
import { Body, Caption, Eyebrow, H3, Badge, Small, Progress, STATUS_LABEL } from "@/src/components/ui";
import { fmtDate } from "@/src/api";

const useStyles = makeStyles((c) => ({
  hero: { backgroundColor: c.nearBlack, overflow: "hidden" },
  heroOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space.xl, gap: space.md },
  frame: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  hotspotRow: { position: "absolute", left: space.md, right: space.md, bottom: space.md, flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  hotspot: { height: 34, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: c.glass, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", justifyContent: "center" },
  hotspotActive: { backgroundColor: c.surfaceInverse },
  infoCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space.lg, gap: space.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  qualityTag: { position: "absolute", top: space.md, right: space.md, backgroundColor: c.glassDark, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.sm },
  gridCell: { width: "48%", borderRadius: radius.md, padding: space.md, gap: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
}));

const FALLBACK_HERO = "https://oka-bau.eu/assets/work/treppenhaus.webp";

/** Cinematic architectural hero. Falls back to a real OKA Bau photograph when WebGL is unavailable. */
export function HeroScene({ height, scroll = 0, children, fallbackImage }: { height: number; scroll?: number; children?: React.ReactNode; fallbackImage?: string | null }) {
  const s = useStyles();
  const { quality, reducedMotion } = useQuality();
  const { colors } = useTheme();
  return (
    <View style={[s.hero, { height }]} testID="hero-3d">
      {quality === "FALLBACK" ? (
        <Image source={{ uri: fallbackImage || FALLBACK_HERO }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={600} />
      ) : (
        <SceneCanvas dpr={DPR[quality]} shadows={quality !== "LOW"} background={colors.nearBlack} style={{ height }}>
          <color attach="background" args={["#0E0E0E"]} />
          <fog attach="fog" args={["#0E0E0E", 12, 26]} />
          <Lights quality={quality} />
          <CameraRig autoRotate={!reducedMotion} scroll={scroll} radius={16} height={5.5} target={[0, 1.8, 0]} />
          <House interactive={false} />
        </SceneCanvas>
      )}
      <LinearGradient colors={["rgba(14,14,14,0)", "rgba(14,14,14,0.55)", "rgba(14,14,14,0.96)"]} locations={[0.25, 0.6, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none" />
      <Animated.View entering={FadeInUp.duration(700)} style={s.heroOverlay} pointerEvents="box-none">
        {children}
      </Animated.View>
    </View>
  );
}

const SERVICE_BY_ZONE: Record<ZoneKey, { title: string; text: string; key: string }> = {
  bathroom: { key: "renovierung", title: "Renovierung & Badsanierung", text: "Von der Vorbereitung bis zum fertigen Raum – strukturiert und zuverlässig." },
  walls: { key: "innenausbau", title: "Innenausbau & Trockenbau", text: "Wände, Decken, Verkleidungen und Ausbauarbeiten sauber koordiniert." },
  ceiling: { key: "innenausbau", title: "Innenausbau & Trockenbau", text: "Decken, Abhängungen und Anschlüsse präzise ausgeführt." },
  floor: { key: "boden", title: "Boden & Leisten", text: "Saubere Untergründe, präzise Verlegung und stimmige Abschlüsse." },
  doors: { key: "tueren", title: "Türen & Fenstermontage", text: "Montage, Anpassung und saubere Anschlüsse für Bestand und Neubau." },
  windows: { key: "tueren", title: "Türen & Fenstermontage", text: "Fenstermontage mit sauberen Anschlüssen und Fugen." },
  interior: { key: "renovierung", title: "Renovierung", text: "Bestehende Räume werden strukturiert überarbeitet – vom Untergrund bis zum Finish." },
  exterior: { key: "hausmeister", title: "Hausmeisterservice & Reinigung", text: "Laufende Objektbetreuung, kleine Instandhaltungen und Reinigung." },
};

/** Interactive service house: tap a building element → related OKA Bau service. */
export function ServiceHouse({ onOpenService }: { onOpenService?: (serviceKey: string) => void }) {
  const s = useStyles();
  const { quality, reducedMotion } = useQuality();
  const { colors } = useTheme();
  const [sel, setSel] = useState<ZoneKey | null>("bathroom");
  const zones = Object.keys(ZONE_LABEL) as ZoneKey[];
  const info = sel ? SERVICE_BY_ZONE[sel] : null;
  return (
    <View style={{ gap: space.lg }} testID="service-house">
      <View style={[s.frame, { height: 340 }]}>
        {quality === "FALLBACK" ? (
          <Image source={{ uri: "https://oka-bau.eu/assets/work/staenderwand.webp" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <SceneCanvas dpr={DPR[quality]} shadows={quality !== "LOW"} background={colors.surfaceTertiary} camera={{ position: [8, 5, 8], fov: 40 }} style={{ height: 340 }}>
            <color attach="background" args={["#EAE8E1"]} />
            <Lights quality={quality} />
            <CameraRig autoRotate={!reducedMotion} radius={13} height={5.5} />
            <House selected={sel} onSelect={setSel} cutaway />
          </SceneCanvas>
        )}
        <View style={s.hotspotRow}>
          {zones.map((z) => (
            <Pressable key={z} testID={`hotspot-${z}`} onPress={() => setSel(z)} style={[s.hotspot, sel === z && s.hotspotActive]}>
              <Caption style={sel === z ? { color: colors.onSurfaceInverse } : { color: colors.onSurface }}>{ZONE_LABEL[z]}</Caption>
            </Pressable>
          ))}
        </View>
      </View>
      {info ? (
        <Animated.View key={sel} entering={FadeIn.duration(300)} style={s.infoCard} testID="service-house-info">
          <Eyebrow>{sel ? ZONE_LABEL[sel] : ""}</Eyebrow>
          <H3>{info.title}</H3>
          <Small>{info.text}</Small>
          <Pressable testID="service-house-cta" onPress={() => onOpenService?.(info.key)} style={{ paddingTop: space.sm }}>
            <Body style={{ color: colors.brandPrimary, fontWeight: "600" }}>Leistung ansehen →</Body>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

export type Zone = {
  id: string; object_name: string; display_name: string; description?: string; progress: number; status: string; color?: string; color_state?: string | null;
  actual_finish?: string | null; expected_finish?: string | null; start_date?: string | null; photo_count?: number; document_count?: number; project_stage?: string | null;
  history?: { status: string; progress: number; at: string }[]; client_visible?: boolean; assigned_employee_id?: string | null;
};

const KNOWN: ZoneKey[] = ["bathroom", "walls", "ceiling", "floor", "doors", "windows", "interior", "exterior"];
export const zoneKeyOf = (z: Zone): ZoneKey | null => {
  const n = (z.object_name || "").toLowerCase();
  const found = KNOWN.find((k) => n.includes(k));
  if (found) return found;
  if (/bad|bath/.test(n)) return "bathroom";
  if (/wand|wall/.test(n)) return "walls";
  if (/decke|ceil/.test(n)) return "ceiling";
  if (/boden|floor/.test(n)) return "floor";
  if (/t(ü|ue)r|door/.test(n)) return "doors";
  if (/fenster|window/.test(n)) return "windows";
  if (/au(ß|ss)en|exterior|garten/.test(n)) return "exterior";
  if (/wohn|küche|kueche|schlaf|innen|interior|living|kitchen|bed/.test(n)) return "interior";
  return null;
};

/** Zone state at a given timeline moment (ms). */
export function zoneAt(z: Zone, time: number | null): { status: string; progress: number } {
  if (time == null || !z.history?.length) return { status: z.status, progress: z.progress };
  let st = { status: "PLANNED", progress: 0 };
  for (const h of z.history) if (new Date(h.at).getTime() <= time) st = { status: h.status, progress: h.progress };
  return st;
}

export function statusHex(colors: any, status: string, override?: string | null) {
  return override || (colors[STATUS_COLOR_KEY[status]] as string) || colors.statusPlanned;
}

/** PROJEKT 3D – digital twin with timeline slider, status colours and 2D fallback. */
export function ProjectTwin({ zones, model, start, end, onSelectZone, selectedId, showTimeline = true, height = 360 }: {
  zones: Zone[]; model?: { model_url?: string | null; camera_config?: any; environment_config?: any } | null; start: string; end?: string | null;
  onSelectZone?: (z: Zone | null) => void; selectedId?: string | null; showTimeline?: boolean; height?: number;
}) {
  const s = useStyles();
  const { quality, reducedMotion } = useQuality();
  const { colors } = useTheme();
  const [t, setT] = useState(1); // 0..1
  const startMs = new Date(start).getTime();
  const endMs = Math.max(end ? new Date(end).getTime() : Date.now(), Date.now());
  const time = t >= 0.999 ? null : startMs + (endMs - startMs) * t;
  const selected = zones.find((z) => z.id === selectedId) || null;

  const zoneColors: Partial<Record<ZoneKey, string>> = {};
  const objColors: Record<string, string> = {};
  zones.forEach((z) => {
    const st = zoneAt(z, time);
    const col = statusHex(colors, st.status, time == null ? z.color_state : null);
    const k = zoneKeyOf(z);
    if (k) zoneColors[k] = col;
    objColors[z.object_name] = col;
  });
  const useGlb = !!model?.model_url;
  const bg = model?.environment_config?.background || "#EAE8E1";
  const cam = model?.camera_config?.position || [8, 5, 8];

  return (
    <View style={{ gap: space.lg }} testID="project-twin">
      {quality === "FALLBACK" ? (
        <ZoneGrid zones={zones} time={time} onSelectZone={onSelectZone} selectedId={selectedId} />
      ) : (
        <View style={[s.frame, { height }]}>
          <SceneCanvas dpr={DPR[quality]} shadows={quality !== "LOW"} background={bg} camera={{ position: cam, fov: model?.camera_config?.fov || 40 }} style={{ height }}>
            <color attach="background" args={[bg]} />
            <Lights quality={quality} />
            <CameraRig autoRotate={!reducedMotion && (model?.camera_config?.auto_rotate ?? true)} radius={Math.max(13, Math.hypot(cam[0], cam[2]))} height={cam[1] || 5.5} target={model?.camera_config?.target || [0, 1.4, 0]} />
            {useGlb ? (
              <GlbModel url={model!.model_url!} zoneColors={objColors} selectedObject={selected?.object_name} onSelectObject={(name) => onSelectZone?.(zones.find((z) => z.object_name === name) || null)} />
            ) : null}
            {!useGlb || quality === "LOW" ? (
              <House cutaway zoneColors={zoneColors} selected={selected ? zoneKeyOf(selected) : null} onSelect={(k) => onSelectZone?.(zones.find((z) => zoneKeyOf(z) === k) || null)} />
            ) : null}
          </SceneCanvas>
          <View style={s.qualityTag}><Caption style={{ color: colors.sand }}>{useGlb ? "GLB · " : ""}{quality}</Caption></View>
        </View>
      )}
      {showTimeline ? (
        <View style={{ gap: space.sm }} testID="twin-timeline">
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Caption>Projektstart · {fmtDate(start)}</Caption>
            <Caption>{time ? fmtDate(new Date(time).toISOString()) : "Heute"}</Caption>
            <Caption>Fertigstellung{end ? ` · ${fmtDate(end)}` : ""}</Caption>
          </View>
          <Slider value={t} onChange={setT} testID="twin-slider" />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
        {["PLANNED", "IN_PROGRESS", "WAITING", "COMPLETED", "PROBLEM"].map((st) => (
          <View key={st} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={[s.legendDot, { backgroundColor: statusHex(colors, st) }]} />
            <Caption>{STATUS_LABEL[st]}</Caption>
          </View>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
        {zones.map((z) => {
          const st = zoneAt(z, time);
          const active = z.id === selectedId;
          return (
            <Pressable key={z.id} testID={`zone-pill-${z.id}`} onPress={() => onSelectZone?.(active ? null : z)} style={[s.hotspot, { backgroundColor: active ? colors.surfaceInverse : colors.surfaceSecondary, borderColor: active ? colors.surfaceInverse : colors.border, flexDirection: "row", gap: 6, alignItems: "center" }]}>
              <View style={[s.legendDot, { backgroundColor: statusHex(colors, st.status) }]} />
              <Caption style={{ color: active ? colors.onSurfaceInverse : colors.onSurface }}>{z.display_name}</Caption>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Premium 2D fallback: room/floor progress grid. Used when no WebGL or no model. */
export function ZoneGrid({ zones, time = null, onSelectZone, selectedId }: { zones: Zone[]; time?: number | null; onSelectZone?: (z: Zone | null) => void; selectedId?: string | null }) {
  const s = useStyles();
  const { colors } = useTheme();
  if (!zones.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }} testID="zone-grid">
      {zones.map((z) => {
        const st = zoneAt(z, time);
        const col = statusHex(colors, st.status);
        const active = selectedId === z.id;
        return (
          <Pressable key={z.id} testID={`zone-cell-${z.id}`} onPress={() => onSelectZone?.(active ? null : z)} style={[s.gridCell, active && { borderColor: colors.onSurface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={[s.legendDot, { backgroundColor: col }]} />
              <Caption>{st.progress}%</Caption>
            </View>
            <Small style={{ fontWeight: "600", color: colors.onSurface }} numberOfLines={1}>{z.display_name}</Small>
            <Progress value={st.progress} color={col} />
            <Badge status={st.status} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Detail card for a selected zone. */
export function ZoneDetail({ zone, onDark }: { zone: Zone; onDark?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  const col = statusHex(colors, zone.status, zone.color_state);
  return (
    <Animated.View entering={FadeIn.duration(250)} style={[s.infoCard, { borderLeftWidth: 4, borderLeftColor: col }]} testID="zone-detail">
      <Eyebrow>{zone.display_name.toUpperCase()}</Eyebrow>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Badge status={zone.status} />
        <H3>{zone.progress}%</H3>
      </View>
      <Progress value={zone.progress} color={col} />
      {zone.description ? <Small>{zone.description}</Small> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.lg, paddingTop: space.sm }}>
        <Meta label="Fertiggestellt" value={fmtDate(zone.actual_finish)} />
        <Meta label="Geplant bis" value={fmtDate(zone.expected_finish)} />
        <Meta label="Fotos" value={String(zone.photo_count ?? 0)} />
        <Meta label="Dokumente" value={String(zone.document_count ?? 0)} />
      </View>
    </Animated.View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Caption>{label}</Caption>
      <Small style={{ fontWeight: "600" }}>{value}</Small>
    </View>
  );
}
