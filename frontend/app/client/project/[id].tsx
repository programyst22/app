import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight01Icon, Camera01Icon, Chat01Icon, File01Icon } from "@hugeicons/core-free-icons";

import { api, fmtDate } from "@/src/api";
import { ProjectTwin, ZoneDetail, ZoneGrid, Zone } from "@/src/three/Experiences";
import { ChipRow, Loading } from "@/src/components/ui";
import { Appointments, Documents, Invoices, Offers, StageStepper, Team, Timeline, Updates } from "@/src/components/project-sections";
import { PremiumHeader, StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const SECTIONS = ["Übersicht", "Räume", "Verlauf", "Mehr"];

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 980, alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  title: { fontFamily: fonts.semibold, color: c.onSurface, letterSpacing: -1.3 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 22 },
  hero: { borderRadius: 30, padding: 24, backgroundColor: c.surfaceInverse, gap: 18 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,.18)", overflow: "hidden" },
  action: { flex: 1, minWidth: 140, minHeight: 110, padding: 17, borderRadius: 22, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, justifyContent: "space-between" },
  section: { borderRadius: 24, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, padding: 20, gap: 15 },
  infoRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.divider, flexDirection: "row", alignItems: "center", gap: 12 },
}));

export default function ClientProject() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const initial = tab === "Projektteam" || tab === "Termine" || tab === "Dokumente" || tab === "Angebote" || tab === "Rechnungen" ? "Mehr" : "Übersicht";
  const [section, setSection] = useState(initial);
  const [zone, setZone] = useState<Zone | null>(null);

  const { data: p, isLoading } = useQuery({ queryKey: ["project", id], queryFn: () => api(`/projects/${id}`) });
  const { data: zones } = useQuery({ queryKey: ["zones", id], queryFn: () => api(`/projects/${id}/zones`) });
  const { data: model } = useQuery({ queryKey: ["model", id], queryFn: () => api(`/projects/${id}/model`) });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });

  if (isLoading || !p) return <Loading text="Projekt wird geladen…" />;

  const pagePad = width < 700 ? 16 : 30;
  const titleSize = width < 700 ? 33 : 44;

  return (
    <View style={s.screen}>
      <PremiumHeader title={p.name} subtitle={p.number} />
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <ChipRow items={SECTIONS} value={section} onChange={setSection} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: pagePad, paddingTop: 20, paddingBottom: 54 }}>
        <View style={[s.shell, { gap: 18 }]}>
          {section === "Übersicht" ? (
            <>
              <View style={s.hero}>
                <Text style={{ color: "rgba(255,255,255,.56)", fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 }}>{String(p.status || "AKTIV").replaceAll("_", " ")}</Text>
                <View>
                  <Text style={{ color: "rgba(255,255,255,.58)", fontFamily: fonts.regular, fontSize: 13 }}>{p.address || "OKA Bau Projekt"}</Text>
                  <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: titleSize, lineHeight: titleSize * 1.04, letterSpacing: -1.2, marginTop: 6 }}>{p.name}</Text>
                </View>
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: fonts.regular, fontSize: 13 }}>{p.stage}</Text>
                    <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 14 }}>{p.progress}%</Text>
                  </View>
                  <View style={[s.progressTrack, { marginTop: 9 }]}><View style={{ width: `${Math.max(0, Math.min(100, p.progress || 0))}%`, height: "100%", backgroundColor: colors.brand }} /></View>
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <ActionCard icon={Chat01Icon} title="Chat" subtitle={`${p.counts?.unread_messages || 0} ungelesen`} onPress={() => router.push(`/client/chat/${id}`)} />
                <ActionCard icon={Camera01Icon} title="Medien" subtitle={`${p.counts?.photos || 0} Fotos`} onPress={() => router.push("/(tabs)/medien")} />
                <ActionCard icon={File01Icon} title="Dateien" subtitle={`${p.counts?.documents || 0} Dokumente`} onPress={() => router.push("/(tabs)/dateien")} />
              </View>

              <View style={s.section}>
                <Text style={s.eyebrow}>PROJEKT PULSE</Text>
                <StageStepper stages={meta?.workflow_stages || []} current={p.stage} />
              </View>

              <View style={s.section}>
                <Text style={s.eyebrow}>JETZT WICHTIG</Text>
                <InfoRow title={p.latest_update?.title || "Projekt ist aktuell"} subtitle={p.latest_update?.created_at ? fmtDate(p.latest_update.created_at, true) : "Noch keine Aktualisierung"} />
                <InfoRow title={p.next_appointment ? `${p.next_appointment.type} · ${fmtDate(p.next_appointment.start, true)}` : "Kein Termin geplant"} subtitle="Nächster Termin" />
                <InfoRow title={p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "OKA Bau"} subtitle="Projektleitung" last />
              </View>
            </>
          ) : null}

          {section === "Räume" ? (
            <>
              <View>
                <Text style={s.eyebrow}>OKA SPACE</Text>
                <Text style={[s.title, { fontSize: titleSize, lineHeight: titleSize * 1.05, marginTop: 7 }]}>Ihr Objekt als{"\n"}digitaler Raum.</Text>
                <Text style={[s.body, { marginTop: 10 }]}>Tippen Sie auf einen Bereich, um Status und Fortschritt zu sehen.</Text>
              </View>
              {(zones?.length || model) ? (
                <>
                  <ProjectTwin zones={zones || []} model={model} start={p.start_date || p.created_at} end={p.planned_finish} onSelectZone={setZone} selectedId={zone?.id} />
                  {zones?.length ? <ZoneGrid zones={zones} onSelectZone={setZone} selectedId={zone?.id} /> : null}
                  {zone ? <ZoneDetail zone={zone} /> : null}
                </>
              ) : (
                <View style={s.section}>
                  <Text style={[s.title, { fontSize: 23 }]}>Digitaler Zwilling wird vorbereitet.</Text>
                  <Text style={s.body}>Sobald Räume oder ein 3D-Modell freigegeben sind, erscheinen sie hier automatisch.</Text>
                </View>
              )}
            </>
          ) : null}

          {section === "Verlauf" ? (
            <>
              <Updates projectId={id} />
              <Text style={s.eyebrow}>GESAMTER VERLAUF</Text>
              <Timeline projectId={id} />
            </>
          ) : null}

          {section === "Mehr" ? (
            <>
              <View style={s.section}><Text style={s.eyebrow}>TERMINE</Text><Appointments projectId={id} canConfirm /></View>
              <View style={s.section}><Text style={s.eyebrow}>DOKUMENTE</Text><Documents projectId={id} /></View>
              <View style={s.section}><Text style={s.eyebrow}>ANGEBOTE</Text><Offers projectId={id} /></View>
              <View style={s.section}><Text style={s.eyebrow}>RECHNUNGEN</Text><Invoices projectId={id} /></View>
              <View style={s.section}><Text style={s.eyebrow}>PROJEKTTEAM</Text><Team project={p} /></View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, onPress }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={s.action} onPress={onPress}>
      <StrokeIcon icon={icon} size={21} color={colors.onSurface} />
      <View>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 16 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function InfoRow({ title, subtitle, last = false }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</Text>
      </View>
      <StrokeIcon icon={ArrowRight01Icon} size={17} color={colors.muted} />
    </View>
  );
}
