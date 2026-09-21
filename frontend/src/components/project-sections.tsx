import React, { useState } from "react";
import {
  View,
  Pressable,
  Linking,
  useWindowDimensions,
  ScrollView,
  Text,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { api, abs, fmtDate, fmtMoney, getToken, API } from "@/src/api";
import { useAuth, isManagement } from "@/src/auth";
import Slider from "@/src/three/Slider";
import {
  Badge,
  Empty,
  Loading,
  Button,
  ChipRow,
  useToast,
  statusColor,
} from "@/src/components/ui";
import { StrokeIcon, ZoomImage } from "@/src/components/premium";
import { makeStyles, useTheme, space, radius, fonts } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  tl: { flexDirection: "row", gap: 14 },
  tlLine: { width: 1, backgroundColor: c.border, flex: 1, marginLeft: 7 },
  dot: {
    width: 15, height: 15, borderRadius: 8,
    borderWidth: 3, borderColor: c.surface,
  },
  photo: { borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  baWrap: { borderRadius: 20, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  baLabel: {
    position: "absolute", top: 14,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: c.glassDark,
  },
  stage: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingVertical: 10,
  },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  row: {
    minHeight: 72, paddingHorizontal: 18, paddingVertical: 15,
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1, borderColor: c.border,
    borderRadius: 18,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1, borderColor: c.border,
    borderRadius: 20, padding: 20, gap: 10,
  },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, lineHeight: 21 },
  label: {
    fontFamily: fonts.bold, fontSize: 12,
    letterSpacing: 1.2, textTransform: "uppercase", color: c.onSurface,
  },
}));

export const pdfUrl = (path: string) => `${API}${path}?token=${getToken()}`;

function PremiumRow({
  title,
  subtitle,
  onPress,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.row} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={[s.body, { marginTop: 3 }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={colors.onSurface} /> : null)}
    </Pressable>
  );
}

export function StageStepper({ stages, current }: { stages: string[]; current: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const idx = stages.indexOf(current);

  return (
    <View testID="stage-stepper">
      {stages.map((st, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <View key={st} style={s.stage}>
            <View
              style={[
                s.stageDot,
                { backgroundColor: done ? colors.success : active ? colors.onSurface : colors.border },
              ]}
            />
            <Text
              style={{
                flex: 1,
                fontFamily: active ? fonts.semibold : fonts.regular,
                fontSize: 15,
                color: active ? colors.onSurface : done ? colors.onSurfaceTertiary : colors.muted,
              }}
            >
              {st}
            </Text>
            {active ? (
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.onSurface }}>
                aktuell
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function Timeline({ projectId }: { projectId: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ["timeline", projectId],
    queryFn: () => api(`/projects/${projectId}/timeline`),
  });
  if (isLoading) return <Loading />;
  const events = [...(data?.events || [])].reverse();
  if (!events.length) return <Empty title="Noch keine Ereignisse" />;

  return (
    <View testID="timeline">
      {events.map((e: any, i: number) => (
        <View key={i} style={s.tl}>
          <View style={{ alignItems: "center" }}>
            <View
              style={[
                s.dot,
                {
                  backgroundColor:
                    e.type === "stage"
                      ? colors.onSurface
                      : e.type === "zone"
                      ? statusColor(colors, e.status)
                      : colors.muted,
                },
              ]}
            />
            {i < events.length - 1 ? <View style={s.tlLine} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 20, gap: 4 }}>
            <Text style={[s.body, { fontSize: 12 }]}>
              {fmtDate(e.at, true)} · {e.type === "stage" ? "Phase" : e.type === "zone" ? "Bereich" : "Update"}
            </Text>
            <Text style={s.title}>{e.label}</Text>
            {e.status ? (
              <Badge status={e.status} label={`${e.progress ?? 0}%`} />
            ) : e.progress != null ? (
              <Text style={s.body}>Fortschritt {e.progress}%</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function Updates({ projectId }: { projectId: string }) {
  const s = useStyles();
  const { data, isLoading } = useQuery({
    queryKey: ["updates", projectId],
    queryFn: () => api(`/projects/${projectId}/updates`),
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty title="Noch keine Aktualisierungen" />;

  return (
    <View style={{ gap: 14 }} testID="updates-list">
      {data.map((u: any) => (
        <View key={u.id} style={s.card}>
          <Text style={[s.body, { fontSize: 12 }]}>
            {fmtDate(u.created_at, true)} · {u.author_name}{u.client_visible ? "" : " · intern"}
          </Text>
          <Text style={[s.title, { fontSize: 19 }]}>{u.title}</Text>
          {u.description ? <Text style={s.body}>{u.description}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {u.stage ? <Badge label={u.stage} /> : null}
            {u.progress != null ? <Badge status="IN_PROGRESS" label={`${u.progress}%`} /> : null}
          </View>
          {u.photo_urls?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {u.photo_urls.map((p: string, j: number) => (
                <ZoomImage key={j} source={{ uri: abs(p) }} style={{ width: 126, height: 126, borderRadius: 14 }} />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function MediaGrid({
  projectId,
  groupBy = "phase",
}: {
  projectId: string;
  groupBy?: "phase" | "date" | "zone" | "type";
}) {
  const s = useStyles();
  const { width } = useWindowDimensions();
  const [g, setG] = useState(groupBy);
  const { data, isLoading } = useQuery({
    queryKey: ["media", projectId],
    queryFn: () => api(`/projects/${projectId}/media`),
  });
  const { data: zones } = useQuery({
    queryKey: ["zones", projectId],
    queryFn: () => api(`/projects/${projectId}/zones`),
  });

  if (isLoading) return <Loading />;
  if (!data?.length) {
    return <Empty title="Noch keine Fotos" text="Aufnahmen der Baustelle erscheinen hier, sobald das Team sie freigibt." />;
  }

  const key = (m: any) =>
    g === "phase"
      ? m.phase || "Ohne Phase"
      : g === "date"
      ? fmtDate(m.created_at)
      : g === "zone"
      ? zones?.find((z: any) => z.id === m.zone_id)?.display_name || "Allgemein"
      : m.content_type?.startsWith("video")
      ? "Videos"
      : m.media_kind === "360"
      ? "360°"
      : "Fotos";

  const groups: Record<string, any[]> = {};
  data.forEach((m: any) => (groups[key(m)] = [...(groups[key(m)] || []), m]));

  const columns = width < 560 ? 2 : width < 980 ? 3 : 4;
  const pad = 40;
  const gap = 9;
  const w = Math.max(110, (Math.min(width, 1180) - pad - gap * (columns - 1)) / columns);

  return (
    <View style={{ gap: 20 }} testID="media-grid">
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow
          items={["phase", "date", "zone", "type"] as const}
          value={g}
          onChange={setG}
          labels={{ phase: "Phase", date: "Datum", zone: "Raum", type: "Typ" }}
          testID="media-group"
        />
      </View>
      {Object.entries(groups).map(([k, items]) => (
        <View key={k} style={{ gap: 10 }}>
          <Text style={s.label}>{k} · {items.length}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
            {items.map((m: any) => (
              <Pressable key={m.id} onPress={() => Linking.openURL(abs(m.url)!)} testID={`media-${m.id}`}>
                {m.content_type?.startsWith("video") ? (
                  <View
                    style={[
                      s.photo,
                      {
                        width: w,
                        height: w,
                        backgroundColor: "#111",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: "#fff" }}>
                      VIDEO
                    </Text>
                  </View>
                ) : (
                  <ZoomImage source={{ uri: abs(m.url) }} style={[s.photo, { width: w, height: w }]} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function BeforeAfter({ projectId, editable }: { projectId: string; editable?: boolean }) {
  const s = useStyles();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["before-after", projectId],
    queryFn: () => api(`/projects/${projectId}/before-after`),
  });
  const patch = useMutation({
    mutationFn: ({ bid, body }: any) =>
      api(`/projects/${projectId}/before-after/${bid}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["before-after", projectId] });
      qc.invalidateQueries({ queryKey: ["public-before-after"] });
    },
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty title="Noch kein Vorher / Nachher" />;

  return (
    <View style={{ gap: 24 }}>
      {data.map((b: any) => (
        <View key={b.id} style={{ gap: 10 }}>
          <BASlider item={b} width={Math.min(width - 40, 1000)} styles={s} />
          {editable ? (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Badge
                status={b.client_visible ? "COMPLETED" : "PLANNED"}
                label={b.client_visible ? "Kunde sieht" : "intern"}
              />
              {isManagement(user) ? (
                <Button
                  title={b.published ? "Aus Portfolio entfernen" : "Im Portfolio veröffentlichen"}
                  small
                  variant={b.published ? "ghost" : "light"}
                  onPress={() => patch.mutate({ bid: b.id, body: { published: !b.published } })}
                  testID={`ba-publish-${b.id}`}
                />
              ) : b.published ? (
                <Badge status="ACCEPTED" label="Veröffentlicht" />
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function BASlider({ item, width, styles: s, dark }: any) {
  const [v, setV] = useState(0.5);
  const h = Math.min(360, Math.max(250, width * 0.52));

  return (
    <View style={{ gap: 10 }} testID={`before-after-${item.id}`}>
      <View style={[s.baWrap, { width, height: h }]}>
        <Image source={{ uri: abs(item.after_url) }} style={{ width, height: h }} contentFit="cover" />
        <View style={{ position: "absolute", left: 0, top: 0, width: width * v, height: h, overflow: "hidden" }}>
          <Image source={{ uri: abs(item.before_url) }} style={{ width, height: h }} contentFit="cover" />
        </View>
        <View style={{ position: "absolute", left: width * v - 1, top: 0, width: 2, height: h, backgroundColor: "#fff" }} />
        <View
          style={{
            position: "absolute",
            left: width * v - 20,
            top: h / 2 - 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.bold, color: "#111", fontSize: 14 }}>↔</Text>
        </View>
        <View style={[s.baLabel, { left: 14 }]}>
          <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 12 }}>Vorher</Text>
        </View>
        <View style={[s.baLabel, { right: 14 }]}>
          <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 12 }}>Nachher</Text>
        </View>
      </View>
      <Slider value={v} onChange={setV} testID={`ba-slider-${item.id}`} />
      {item.title ? <Text style={s.title}>{item.title}</Text> : null}
      {item.description ? <Text style={s.body}>{item.description}</Text> : null}
      <Text style={[s.body, { fontSize: 12 }]}>
        {fmtDate(item.date)}{item.category ? ` · ${item.category}` : ""}
      </Text>
    </View>
  );
}

export function Appointments({ projectId, canConfirm }: { projectId: string; canConfirm?: boolean }) {
  const s = useStyles();
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["appointments", projectId],
    queryFn: () => api(`/appointments?project_id=${projectId}`),
  });
  const m = useMutation({
    mutationFn: ({ id, st }: any) =>
      api(`/appointments/${id}`, { method: "PATCH", json: { confirmation_status: st } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.show("Termin aktualisiert", "success");
    },
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty title="Keine Termine" />;

  return (
    <View style={{ gap: 12 }} testID="appointments-list">
      {data.map((a: any) => (
        <View key={a.id} style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <Text style={s.label}>{a.type}</Text>
            <Badge status={a.confirmation_status} />
          </View>
          <Text style={[s.title, { fontSize: 18 }]}>{a.title}</Text>
          <Text style={s.body}>
            {fmtDate(a.start, true)}{a.end ? ` – ${fmtDate(a.end, true)}` : ""}
          </Text>
          {a.location ? <Text style={s.body}>{a.location}</Text> : null}
          {a.description ? <Text style={s.body}>{a.description}</Text> : null}
          {canConfirm && a.confirmation_status === "PENDING" ? (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button title="Bestätigen" small onPress={() => m.mutate({ id: a.id, st: "CONFIRMED" })} testID={`confirm-${a.id}`} />
              <Button title="Absagen" small variant="ghost" onPress={() => m.mutate({ id: a.id, st: "DECLINED" })} testID={`decline-${a.id}`} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function Documents({ projectId }: { projectId: string }) {
  const [cat, setCat] = useState("Alle");
  const { data, isLoading } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => api(`/projects/${projectId}/documents`),
  });

  if (isLoading) return <Loading />;
  const cats = ["Alle", ...Array.from(new Set<string>((data || []).map((d: any) => d.category).filter((category: unknown): category is string => typeof category === "string")))];
  const list = (data || []).filter((d: any) => cat === "Alle" || d.category === cat);

  return (
    <View style={{ gap: 12 }} testID="documents-list">
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={cats} value={cat} onChange={setCat} testID="doc-filter" />
      </View>
      {!list.length ? (
        <Empty title="Keine Dokumente" />
      ) : (
        list.map((d: any) => (
          <PremiumRow
            key={d.id}
            title={d.title || d.filename}
            subtitle={`${d.category} · ${fmtDate(d.created_at)} · ${Math.round((d.size || 0) / 1024)} KB`}
            onPress={() => Linking.openURL(abs(d.url)!)}
            testID={`doc-${d.id}`}
          />
        ))
      )}
    </View>
  );
}

export function Offers({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["offers", projectId],
    queryFn: () => api(`/offers${projectId ? `?project_id=${projectId}` : ""}`),
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty title="Keine Angebote" />;

  return (
    <View style={{ gap: 12 }} testID="offers-list">
      {data.map((o: any) => (
        <PremiumRow
          key={o.id}
          title={`${o.number} · ${fmtMoney(o.total)}`}
          subtitle={`${fmtDate(o.date)}${o.expiration_date ? ` · gültig bis ${fmtDate(o.expiration_date)}` : ""}`}
          right={<Badge status={o.status} />}
          onPress={() => router.push(`/client/offer/${o.id}`)}
          testID={`offer-${o.id}`}
        />
      ))}
    </View>
  );
}

export function Invoices({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoices", projectId],
    queryFn: () => api(`/invoices${projectId ? `?project_id=${projectId}` : ""}`),
  });

  if (isLoading) return <Loading />;
  if (!data?.length) return <Empty title="Keine Rechnungen" />;

  return (
    <View style={{ gap: 12 }} testID="invoices-list">
      {data.map((inv: any) => (
        <PremiumRow
          key={inv.id}
          title={`${inv.number} · ${fmtMoney(inv.total)}`}
          subtitle={`Ausgestellt ${fmtDate(inv.issue_date)} · fällig ${fmtDate(inv.due_date)}`}
          right={<Badge status={inv.status} />}
          onPress={() => Linking.openURL(pdfUrl(`/invoices/${inv.id}/pdf`))}
          testID={`invoice-${inv.id}`}
        />
      ))}
    </View>
  );
}

export function Team({ project }: { project: any }) {
  const s = useStyles();
  const pm = project?.project_manager;

  return (
    <View style={{ gap: 12 }} testID="team-list">
      {pm ? (
        <PremiumRow
          title={`${pm.first_name} ${pm.last_name}`}
          subtitle={`Projektleitung${pm.phone ? ` · ${pm.phone}` : ""}`}
          onPress={pm.phone ? () => Linking.openURL(`tel:${pm.phone}`) : undefined}
        />
      ) : null}

      {(project?.team || []).map((t: any) => (
        <PremiumRow
          key={t.id}
          title={`${t.first_name} ${t.last_name}`}
          subtitle={t.role === "EMPLOYEE" ? "Mitarbeiter" : t.role}
        />
      ))}

      {!pm && !(project?.team || []).length ? <Empty title="Team wird zugewiesen" /> : null}

      <View style={s.card}>
        <Text style={s.label}>OKA BAU GMBH & CO. KG</Text>
        <Text
          style={[s.title, { fontSize: 17 }]}
          onPress={() => Linking.openURL("tel:+4982165085943")}
        >
          +49 821 65085943
        </Text>
      </View>
    </View>
  );
}

export const useSectionStyles = useStyles;
