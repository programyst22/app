import React, { useEffect, useState } from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight01Icon, Message01Icon } from "@hugeicons/core-free-icons";

import { api, fmtDate } from "@/src/api";
import { ProjectTwin, ZoneGrid, ZoneDetail, Zone } from "@/src/three/Experiences";
import {
  Badge,
  Progress,
  ChipRow,
  Loading,
  Empty,
} from "@/src/components/ui";
import {
  StageStepper,
  Timeline,
  Updates,
  MediaGrid,
  BeforeAfter,
  Appointments,
  Documents,
  Offers,
  Invoices,
  Team,
} from "@/src/components/project-sections";
import { PremiumHeader, StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme, space } from "@/src/theme";

const TABS = [
  "Übersicht",
  "3D Projekt",
  "Fortschritt",
  "Timeline",
  "Fotos",
  "Vorher / Nachher",
  "Termine",
  "Nachrichten",
  "Dokumente",
  "Angebote",
  "Rechnungen",
  "Projektteam",
];

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1180, alignSelf: "center" },
  hero: {
    backgroundColor: c.surfaceInverse,
    borderRadius: 26,
    padding: 26,
    gap: 18,
  },
  overline: {
    fontFamily: fonts.bold,
    color: c.onSurface,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.semibold,
    color: c.onSurface,
    letterSpacing: -1.2,
  },
  body: {
    fontFamily: fonts.regular,
    color: c.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  metric: {
    flex: 1,
    minWidth: 145,
    borderRadius: 18,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    padding: 20,
    gap: 7,
  },
  metricValue: {
    fontFamily: fonts.semibold,
    color: c.onSurface,
    fontSize: 32,
    letterSpacing: -1,
  },
  metricLabel: {
    fontFamily: fonts.regular,
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 20,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  infoRow: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    padding: 22,
    gap: 16,
  },
}));

function InfoRow({ title, subtitle, onPress, last = false }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 15 }}>{title}</Text>
        <Text style={[s.body, { fontSize: 13, lineHeight: 19, marginTop: 3 }]}>{subtitle}</Text>
      </View>
      {onPress ? <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={colors.onSurface} /> : null}
    </Pressable>
  );
}

export default function ClientProject() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState(initialTab && TABS.includes(initialTab) ? initialTab : "Übersicht");
  const [zone, setZone] = useState<Zone | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api(`/projects/${id}`),
  });
  const { data: zones } = useQuery({
    queryKey: ["zones", id],
    queryFn: () => api(`/projects/${id}/zones`),
  });
  const { data: model } = useQuery({
    queryKey: ["model", id],
    queryFn: () => api(`/projects/${id}/model`),
  });
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api("/meta"),
  });

  useEffect(() => {
    if (tab === "Nachrichten") {
      router.push(`/client/chat/${id}`);
      setTab("Übersicht");
    }
  }, [tab, id, router]);

  const pagePad = width < 700 ? 20 : 34;
  const titleSize = width < 700 ? 31 : 42;

  return (
    <View style={s.screen}>
      <PremiumHeader title={p?.name || "Mein Projekt"} subtitle={p?.number} />
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ChipRow items={TABS} value={tab} onChange={setTab} testID="project-tabs" />
      </View>

      {isLoading || !p ? (
        <Loading text="Projekt wird geladen…" />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: pagePad,
            paddingTop: 24,
            paddingBottom: 70,
          }}
          testID={`project-section-${tab}`}
        >
          <View style={[s.shell, { gap: 20 }]}>
            {tab === "Übersicht" ? (
              <>
                <View style={s.hero}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={{ color: "rgba(255,255,255,.68)", fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2 }}>
                      {p.number}
                    </Text>
                    <Badge status={p.status} />
                  </View>
                  <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: titleSize, lineHeight: titleSize * 1.08, letterSpacing: -1.2 }}>
                    {p.name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,.72)", fontFamily: fonts.regular, fontSize: 15 }}>
                    {p.address}
                  </Text>

                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: "rgba(255,255,255,.72)", fontFamily: fonts.regular, fontSize: 13 }}>
                        {p.stage}
                      </Text>
                      <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 14 }}>{p.progress}%</Text>
                    </View>
                    <Progress value={p.progress} />
                  </View>

                  <Pressable
                    onPress={() => setTab("3D Projekt")}
                    testID="overview-open-3d"
                    style={{
                      minHeight: 48,
                      alignSelf: "flex-start",
                      paddingHorizontal: 18,
                      borderRadius: 999,
                      backgroundColor: "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text style={{ color: "#111", fontFamily: fonts.semibold, fontSize: 14 }}>
                      {p.has_3d_model ? "3D-Modell ansehen" : "Fortschritt in 3D"}
                    </Text>
                    <StrokeIcon icon={ArrowUpRight01Icon} size={18} color="#111" />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                  {[
                    ["Nachrichten", p.counts.unread_messages, () => router.push(`/client/chat/${id}`), "ov-messages"],
                    ["Fotos", p.counts.photos, () => setTab("Fotos"), "ov-photos"],
                    ["Dokumente", p.counts.documents, () => setTab("Dokumente"), "ov-documents"],
                    ["Offene Angebote", p.counts.open_offers, () => setTab("Angebote"), "ov-offers"],
                  ].map(([label, value, onPress, testID]: any) => (
                    <Pressable key={label} onPress={onPress} style={s.metric} testID={testID}>
                      <Text style={s.metricValue}>{value}</Text>
                      <Text style={s.metricLabel}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={s.infoCard}>
                  <InfoRow
                    title={p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "–"}
                    subtitle="Projektleitung"
                    onPress={() => setTab("Projektteam")}
                  />
                  <InfoRow
                    title={p.next_appointment ? `${p.next_appointment.type} · ${fmtDate(p.next_appointment.start, true)}` : "Kein Termin geplant"}
                    subtitle="Nächster Termin"
                    onPress={() => setTab("Termine")}
                  />
                  <InfoRow
                    title={p.latest_update?.title || "Noch keine Aktualisierung"}
                    subtitle={p.latest_update ? fmtDate(p.latest_update.created_at, true) : "Letzte Aktualisierung"}
                    onPress={() => setTab("Timeline")}
                    last={!p.client_notes}
                  />
                  {p.client_notes ? (
                    <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
                      <Text style={s.overline}>HINWEISE VON OKA BAU</Text>
                      <Text style={[s.body, { marginTop: 8 }]}>{p.client_notes}</Text>
                    </View>
                  ) : null}
                </View>

                {p.description ? (
                  <View style={s.sectionCard}>
                    <Text style={s.overline}>BESCHREIBUNG</Text>
                    <Text style={s.body}>{p.description}</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {tab === "3D Projekt" ? (
              <>
                <Text style={s.overline}>PROJEKT 3D · DIGITALER ZWILLING</Text>
                {(zones?.length || model) ? (
                  <>
                    <ProjectTwin
                      zones={zones || []}
                      model={model}
                      start={p.start_date || p.created_at}
                      end={p.planned_finish}
                      onSelectZone={setZone}
                      selectedId={zone?.id}
                    />
                    {zone ? (
                      <ZoneDetail zone={zone} />
                    ) : (
                      <Text style={s.body}>
                        Wählen Sie einen Raum oder ein Element, um Status, Fortschritt, Fotos und Dokumente zu sehen.
                      </Text>
                    )}
                  </>
                ) : (
                  <View style={s.sectionCard} testID="no-3d-fallback">
                    <Text style={[s.title, { fontSize: 23, lineHeight: 29 }]}>Noch kein 3D-Modell hinterlegt</Text>
                    <Text style={s.body}>
                      Ihr Projekt wird aktuell in der Phase „{p.stage}“ bearbeitet. Sobald OKA Bau Bereiche oder ein Modell freigibt,
                      sehen Sie hier den digitalen Zwilling.
                    </Text>
                    <Progress value={p.progress} />
                    <Text style={s.body}>{p.progress}% Gesamtfortschritt</Text>
                  </View>
                )}
              </>
            ) : null}

            {tab === "Fortschritt" ? (
              <>
                <View style={s.sectionCard}>
                  <Text style={s.overline}>GESAMTFORTSCHRITT</Text>
                  <Text style={[s.title, { fontSize: 42 }]}>{p.progress}%</Text>
                  <Progress value={p.progress} />
                </View>
                <Text style={s.overline}>BEREICHE</Text>
                {zones?.length ? (
                  <ZoneGrid zones={zones} onSelectZone={setZone} selectedId={zone?.id} />
                ) : (
                  <Text style={s.body}>Noch keine Bereiche definiert.</Text>
                )}
                {zone ? <ZoneDetail zone={zone} /> : null}
                <Text style={s.overline}>PROJEKTPHASEN</Text>
                <StageStepper stages={meta?.workflow_stages || []} current={p.stage} />
              </>
            ) : null}

            {tab === "Timeline" ? (
              <>
                <Updates projectId={id} />
                <Text style={s.overline}>VERLAUF</Text>
                <Timeline projectId={id} />
              </>
            ) : null}
            {tab === "Fotos" ? <MediaGrid projectId={id} /> : null}
            {tab === "Vorher / Nachher" ? <BeforeAfter projectId={id} /> : null}
            {tab === "Termine" ? <Appointments projectId={id} canConfirm /> : null}
            {tab === "Dokumente" ? <Documents projectId={id} /> : null}
            {tab === "Angebote" ? <Offers projectId={id} /> : null}
            {tab === "Rechnungen" ? <Invoices projectId={id} /> : null}
            {tab === "Projektteam" ? <Team project={p} /> : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
