import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, fmtDate } from "@/src/api";
import { ProjectTwin, ZoneGrid, ZoneDetail, Zone } from "@/src/three/Experiences";
import { Eyebrow, H2, H3, Small, Caption, Badge, Card, Row, Progress, ChipRow, ScreenHeader, Loading, Empty, Button, Stat } from "@/src/components/ui";
import { StageStepper, Timeline, Updates, MediaGrid, BeforeAfter, Appointments, Documents, Offers, Invoices, Team } from "@/src/components/project-sections";
import { makeStyles, useTheme, space } from "@/src/theme";

const TABS = ["Übersicht", "3D Projekt", "Fortschritt", "Timeline", "Fotos", "Vorher / Nachher", "Termine", "Nachrichten", "Dokumente", "Angebote", "Rechnungen", "Projektteam"];
const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function ClientProject() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState(initialTab && TABS.includes(initialTab) ? initialTab : "Übersicht");
  const [zone, setZone] = useState<Zone | null>(null);
  const { data: p, isLoading } = useQuery({ queryKey: ["project", id], queryFn: () => api(`/projects/${id}`) });
  const { data: zones } = useQuery({ queryKey: ["zones", id], queryFn: () => api(`/projects/${id}/zones`) });
  const { data: model } = useQuery({ queryKey: ["model", id], queryFn: () => api(`/projects/${id}/model`) });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });

  if (tab === "Nachrichten") {
    router.replace(`/client/chat/${id}`);
    setTab("Übersicht");
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title={p?.name || "Mein Projekt"} subtitle={p?.number} />
      <ChipRow items={TABS} value={tab} onChange={setTab} testID="project-tabs" />
      {isLoading || !p ? <Loading text="Projekt wird geladen…" /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID={`project-section-${tab}`}>
          {tab === "Übersicht" ? (
            <>
              <Card dark style={{ gap: space.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Eyebrow onDark>{p.number}</Eyebrow><Badge status={p.status} /></View>
                <H2 onDark>{p.name}</H2>
                <Small style={{ color: colors.sand }}>{p.address}</Small>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption onDark>{p.stage}</Caption><Caption onDark>{p.progress}%</Caption></View>
                  <Progress value={p.progress} />
                </View>
                <Button title={p.has_3d_model ? "3D-Modell ansehen" : "Fortschritt in 3D"} variant="accent" small icon="cube-outline" onPress={() => setTab("3D Projekt")} testID="overview-open-3d" />
              </Card>
              <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
                <Stat label="Nachrichten" value={p.counts.unread_messages} accent={p.counts.unread_messages > 0} onPress={() => router.push(`/client/chat/${id}`)} testID="ov-messages" />
                <Stat label="Fotos" value={p.counts.photos} onPress={() => setTab("Fotos")} testID="ov-photos" />
                <Stat label="Dokumente" value={p.counts.documents} onPress={() => setTab("Dokumente")} testID="ov-documents" />
                <Stat label="Offene Angebote" value={p.counts.open_offers} onPress={() => setTab("Angebote")} testID="ov-offers" />
              </View>
              <Card style={{ gap: 0 }}>
                <Row icon="person-outline" title={p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "–"} subtitle="Projektleitung" onPress={() => setTab("Projektteam")} />
                <Row icon="calendar-outline" title={p.next_appointment ? `${p.next_appointment.type} · ${fmtDate(p.next_appointment.start, true)}` : "Kein Termin geplant"} subtitle="Nächster Termin" onPress={() => setTab("Termine")} />
                <Row icon="newspaper-outline" title={p.latest_update?.title || "Noch keine Aktualisierung"} subtitle={p.latest_update ? fmtDate(p.latest_update.created_at, true) : "Letzte Aktualisierung"} onPress={() => setTab("Timeline")} />
                {p.client_notes ? <View style={{ paddingTop: space.md }}><Caption>Hinweise von OKA Bau</Caption><Small>{p.client_notes}</Small></View> : null}
              </Card>
              {p.description ? <View style={{ gap: 4 }}><Eyebrow>Beschreibung</Eyebrow><Small>{p.description}</Small></View> : null}
            </>
          ) : null}

          {tab === "3D Projekt" ? (
            <>
              <Eyebrow>Projekt 3D · Digitaler Zwilling</Eyebrow>
              {(zones?.length || model) ? (
                <>
                  <ProjectTwin zones={zones || []} model={model} start={p.start_date || p.created_at} end={p.planned_finish} onSelectZone={setZone} selectedId={zone?.id} />
                  {zone ? <ZoneDetail zone={zone} /> : <Small>Wählen Sie einen Raum oder ein Element, um Status, Fortschritt, Fotos und Dokumente zu sehen.</Small>}
                </>
              ) : (
                <Card style={{ gap: space.md }} testID="no-3d-fallback">
                  <H3>Noch kein 3D-Modell hinterlegt</H3>
                  <Small>Ihr Projekt wird aktuell in der Phase „{p.stage}“ bearbeitet. Sobald OKA Bau Bereiche oder ein Modell freigibt, sehen Sie hier den digitalen Zwilling.</Small>
                  <Progress value={p.progress} />
                  <Caption>{p.progress}% Gesamtfortschritt</Caption>
                </Card>
              )}
            </>
          ) : null}

          {tab === "Fortschritt" ? (
            <>
              <Card style={{ gap: space.sm }}><Caption>Gesamtfortschritt</Caption><H2>{p.progress}%</H2><Progress value={p.progress} /></Card>
              <Eyebrow>Bereiche</Eyebrow>
              {zones?.length ? <ZoneGrid zones={zones} onSelectZone={setZone} selectedId={zone?.id} /> : <Small>Noch keine Bereiche definiert.</Small>}
              {zone ? <ZoneDetail zone={zone} /> : null}
              <Eyebrow>Projektphasen</Eyebrow>
              <StageStepper stages={meta?.workflow_stages || []} current={p.stage} />
            </>
          ) : null}

          {tab === "Timeline" ? (<><Updates projectId={id} /><Eyebrow style={{ paddingTop: space.md }}>Verlauf</Eyebrow><Timeline projectId={id} /></>) : null}
          {tab === "Fotos" ? <MediaGrid projectId={id} /> : null}
          {tab === "Vorher / Nachher" ? <BeforeAfter projectId={id} /> : null}
          {tab === "Termine" ? <Appointments projectId={id} canConfirm /> : null}
          {tab === "Dokumente" ? <Documents projectId={id} /> : null}
          {tab === "Angebote" ? <Offers projectId={id} /> : null}
          {tab === "Rechnungen" ? <Invoices projectId={id} /> : null}
          {tab === "Projektteam" ? <Team project={p} /> : null}
        </ScrollView>
      )}
    </View>
  );
}
