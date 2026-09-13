import React, { useState } from "react";
import { View, Pressable, Linking, useWindowDimensions, ScrollView, Text } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, abs, fmtDate, fmtMoney, getToken, API } from "@/src/api";
import Slider from "@/src/three/Slider";
import { Caption, Small, H3, Body, Badge, Card, Row, Empty, Loading, Button, ChipRow, useToast, statusColor } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  tl: { flexDirection: "row", gap: space.md },
  tlLine: { width: 2, backgroundColor: c.border, flex: 1, marginLeft: 7 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: c.surface },
  photo: { borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  baWrap: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  baLabel: { position: "absolute", top: space.md, paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.glassDark },
  stage: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 6 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  small: { fontSize: 16, color: c.onSurface, fontWeight: "600" },
}));

export const pdfUrl = (path: string) => `${API}${path}?token=${getToken()}`;

export function StageStepper({ stages, current }: { stages: string[]; current: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const idx = stages.indexOf(current);
  return (
    <View testID="stage-stepper">
      {stages.map((st, i) => {
        const done = i < idx, active = i === idx;
        return (
          <View key={st} style={s.stage}>
            <View style={[s.stageDot, { backgroundColor: done ? colors.success : active ? colors.brandPrimary : colors.border }]} />
            <Small style={{ color: active ? colors.onSurface : done ? colors.onSurfaceTertiary : colors.muted, fontWeight: active ? "700" : "400" }}>{st}</Small>
            {active ? <Caption style={{ color: colors.brandPrimary }}>· aktuell</Caption> : null}
          </View>
        );
      })}
    </View>
  );
}

export function Timeline({ projectId }: { projectId: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ["timeline", projectId], queryFn: () => api(`/projects/${projectId}/timeline`) });
  if (isLoading) return <Loading />;
  const events = [...(data?.events || [])].reverse();
  if (!events.length) return <Empty icon="time-outline" title="Noch keine Ereignisse" />;
  return (
    <View testID="timeline">
      {events.map((e: any, i: number) => (
        <View key={i} style={s.tl}>
          <View style={{ alignItems: "center" }}>
            <View style={[s.dot, { backgroundColor: e.type === "stage" ? colors.onSurface : e.type === "zone" ? statusColor(colors, e.status) : colors.brandPrimary }]} />
            {i < events.length - 1 ? <View style={s.tlLine} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: space.lg, gap: 2 }}>
            <Caption>{fmtDate(e.at, true)} · {e.type === "stage" ? "Phase" : e.type === "zone" ? "Bereich" : "Update"}</Caption>
            <Small style={{ fontWeight: "600", color: colors.onSurface }}>{e.label}</Small>
            {e.status ? <Badge status={e.status} label={`${e.progress ?? 0}%`} /> : e.progress != null ? <Caption>Fortschritt {e.progress}%</Caption> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function Updates({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["updates", projectId], queryFn: () => api(`/projects/${projectId}/updates`) });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty icon="newspaper-outline" title="Noch keine Aktualisierungen" />;
  return (
    <View style={{ gap: space.md }} testID="updates-list">
      {data.map((u: any, i: number) => (
        <Card key={u.id} index={i} style={{ gap: space.sm }}>
          <Caption>{fmtDate(u.created_at, true)} · {u.author_name}{u.client_visible ? "" : " · intern"}</Caption>
          <H3>{u.title}</H3>
          {u.description ? <Small>{u.description}</Small> : null}
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
            {u.stage ? <Badge label={u.stage} /> : null}
            {u.progress != null ? <Badge status="IN_PROGRESS" label={`${u.progress}%`} /> : null}
          </View>
          {u.photo_urls?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>{u.photo_urls.map((p: string, j: number) => <Image key={j} source={{ uri: abs(p) }} style={{ width: 120, height: 120, borderRadius: radius.md }} contentFit="cover" />)}</ScrollView> : null}
        </Card>
      ))}
    </View>
  );
}

export function MediaGrid({ projectId, groupBy = "phase" }: { projectId: string; groupBy?: "phase" | "date" | "zone" | "type" }) {
  const s = useStyles();
  const { width } = useWindowDimensions();
  const [g, setG] = useState(groupBy);
  const { data, isLoading } = useQuery({ queryKey: ["media", projectId], queryFn: () => api(`/projects/${projectId}/media`) });
  const { data: zones } = useQuery({ queryKey: ["zones", projectId], queryFn: () => api(`/projects/${projectId}/zones`) });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty icon="images-outline" title="Noch keine Fotos" text="Aufnahmen der Baustelle erscheinen hier, sobald das Team sie freigibt." />;
  const key = (m: any) => (g === "phase" ? m.phase || "Ohne Phase" : g === "date" ? fmtDate(m.created_at) : g === "zone" ? zones?.find((z: any) => z.id === m.zone_id)?.display_name || "Allgemein" : m.content_type?.startsWith("video") ? "Videos" : m.media_kind === "360" ? "360°" : "Fotos");
  const groups: Record<string, any[]> = {};
  data.forEach((m: any) => (groups[key(m)] = [...(groups[key(m)] || []), m]));
  const w = (width - space.xl * 2 - space.sm * 2) / 3;
  return (
    <View style={{ gap: space.lg }} testID="media-grid">
      <View style={{ marginHorizontal: -space.xl }}><ChipRow items={["phase", "date", "zone", "type"] as const} value={g} onChange={setG} labels={{ phase: "Phase", date: "Datum", zone: "Raum", type: "Typ" }} testID="media-group" /></View>
      {Object.entries(groups).map(([k, items]) => (
        <View key={k} style={{ gap: space.sm }}>
          <Caption style={{ fontWeight: "600" }}>{k} · {items.length}</Caption>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {items.map((m: any) => (
              <Pressable key={m.id} onPress={() => Linking.openURL(abs(m.url)!)} testID={`media-${m.id}`}>
                {m.content_type?.startsWith("video") ? <View style={[s.photo, { width: w, height: w, alignItems: "center", justifyContent: "center" }]}><Ionicons name="play-circle" size={32} color="#FFFFFF" /></View> : <Image source={{ uri: abs(m.url) }} style={[s.photo, { width: w, height: w }]} contentFit="cover" transition={200} />}
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function BeforeAfter({ projectId }: { projectId: string }) {
  const s = useStyles();
  const { width } = useWindowDimensions();
  const { data, isLoading } = useQuery({ queryKey: ["before-after", projectId], queryFn: () => api(`/projects/${projectId}/before-after`) });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty icon="git-compare-outline" title="Noch kein Vorher / Nachher" />;
  return <View style={{ gap: space.xl }}>{data.map((b: any) => <BASlider key={b.id} item={b} width={width - space.xl * 2} styles={s} />)}</View>;
}

function BASlider({ item, width, styles: s }: any) {
  const [v, setV] = useState(0.5);
  const h = 260;
  return (
    <View style={{ gap: space.sm }} testID={`before-after-${item.id}`}>
      <View style={[s.baWrap, { width, height: h }]}>
        <Image source={{ uri: abs(item.after_url) }} style={{ width, height: h }} contentFit="cover" />
        <View style={{ position: "absolute", left: 0, top: 0, width: width * v, height: h, overflow: "hidden" }}>
          <Image source={{ uri: abs(item.before_url) }} style={{ width, height: h }} contentFit="cover" />
        </View>
        <View style={{ position: "absolute", left: width * v - 1, top: 0, width: 2, height: h, backgroundColor: "#FFFFFF" }} />
        <View style={[s.baLabel, { left: space.md }]}><Caption style={{ color: "#FFFFFF" }}>Vorher</Caption></View>
        <View style={[s.baLabel, { right: space.md }]}><Caption style={{ color: "#FFFFFF" }}>Nachher</Caption></View>
      </View>
      <Slider value={v} onChange={setV} testID={`ba-slider-${item.id}`} />
      {item.description ? <Small>{item.description}</Small> : null}
      <Caption>{fmtDate(item.date)}</Caption>
    </View>
  );
}

export function Appointments({ projectId, canConfirm }: { projectId: string; canConfirm?: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["appointments", projectId], queryFn: () => api(`/appointments?project_id=${projectId}`) });
  const m = useMutation({ mutationFn: ({ id, st }: any) => api(`/appointments/${id}`, { method: "PATCH", json: { confirmation_status: st } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.show("Termin aktualisiert", "success"); } });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty icon="calendar-outline" title="Keine Termine" />;
  return (
    <View style={{ gap: space.md }} testID="appointments-list">
      {data.map((a: any, i: number) => (
        <Card key={a.id} index={i} style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption>{a.type}</Caption><Badge status={a.confirmation_status} /></View>
          <H3>{a.title}</H3>
          <Small>{fmtDate(a.start, true)}{a.end ? ` – ${fmtDate(a.end, true)}` : ""}</Small>
          {a.location ? <Small>{a.location}</Small> : null}
          {a.description ? <Caption>{a.description}</Caption> : null}
          {canConfirm && a.confirmation_status === "PENDING" ? (
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button title="Bestätigen" small onPress={() => m.mutate({ id: a.id, st: "CONFIRMED" })} testID={`confirm-${a.id}`} />
              <Button title="Absagen" small variant="ghost" onPress={() => m.mutate({ id: a.id, st: "DECLINED" })} testID={`decline-${a.id}`} />
            </View>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

export function Documents({ projectId }: { projectId: string }) {
  const [cat, setCat] = useState("Alle");
  const { data, isLoading } = useQuery({ queryKey: ["documents", projectId], queryFn: () => api(`/projects/${projectId}/documents`) });
  if (isLoading) return <Loading />;
  const cats = ["Alle", ...Array.from(new Set((data || []).map((d: any) => d.category as string)))];
  const list = (data || []).filter((d: any) => cat === "Alle" || d.category === cat);
  return (
    <View style={{ gap: space.md }} testID="documents-list">
      <View style={{ marginHorizontal: -space.xl }}><ChipRow items={cats} value={cat} onChange={setCat} testID="doc-filter" /></View>
      {!list.length ? <Empty icon="folder-open-outline" title="Keine Dokumente" /> : list.map((d: any) => (
        <Row key={d.id} icon={d.content_type?.includes("pdf") ? "document-text-outline" : "document-outline"} title={d.title || d.filename} subtitle={`${d.category} · ${fmtDate(d.created_at)} · ${Math.round((d.size || 0) / 1024)} KB`} onPress={() => Linking.openURL(abs(d.url)!)} testID={`doc-${d.id}`} />
      ))}
    </View>
  );
}

export function Offers({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["offers", projectId], queryFn: () => api(`/offers${projectId ? `?project_id=${projectId}` : ""}`) });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty icon="document-text-outline" title="Keine Angebote" />;
  return (
    <View testID="offers-list">
      {data.map((o: any) => <Row key={o.id} icon="document-text-outline" title={`${o.number} · ${fmtMoney(o.total)}`} subtitle={`${fmtDate(o.date)}${o.expiration_date ? ` · gültig bis ${fmtDate(o.expiration_date)}` : ""}`} right={<Badge status={o.status} />} onPress={() => router.push(`/client/offer/${o.id}`)} testID={`offer-${o.id}`} />)}
    </View>
  );
}

export function Invoices({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["invoices", projectId], queryFn: () => api(`/invoices${projectId ? `?project_id=${projectId}` : ""}`) });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty icon="card-outline" title="Keine Rechnungen" />;
  return (
    <View testID="invoices-list">
      {data.map((inv: any) => <Row key={inv.id} icon="card-outline" title={`${inv.number} · ${fmtMoney(inv.total)}`} subtitle={`Ausgestellt ${fmtDate(inv.issue_date)} · fällig ${fmtDate(inv.due_date)}`} right={<Badge status={inv.status} />} onPress={() => Linking.openURL(pdfUrl(`/invoices/${inv.id}/pdf`))} testID={`invoice-${inv.id}`} />)}
    </View>
  );
}

export function Team({ project }: { project: any }) {
  const pm = project?.project_manager;
  return (
    <View testID="team-list">
      {pm ? <Row icon="person-circle-outline" title={`${pm.first_name} ${pm.last_name}`} subtitle={`Projektleitung${pm.phone ? ` · ${pm.phone}` : ""}`} onPress={pm.phone ? () => Linking.openURL(`tel:${pm.phone}`) : undefined} /> : null}
      {(project?.team || []).map((t: any) => <Row key={t.id} icon="person-outline" title={`${t.first_name} ${t.last_name}`} subtitle={t.role === "EMPLOYEE" ? "Mitarbeiter" : t.role} />)}
      {!pm && !(project?.team || []).length ? <Empty icon="people-outline" title="Team wird zugewiesen" /> : null}
      <View style={{ paddingTop: space.lg, gap: 4 }}>
        <Caption>OKA Bau GmbH & Co. KG</Caption>
        <Text style={s.small} onPress={() => Linking.openURL("tel:+4982165085943")}>+49 821 65085943</Text>
      </View>
    </View>
  );
}
