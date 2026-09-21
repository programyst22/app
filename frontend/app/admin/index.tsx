import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight01Icon, Logout01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { api, fmtDate } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Badge, Input, Loading } from "@/src/components/ui";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1180, alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  title: { fontFamily: fonts.semibold, color: c.onSurface, letterSpacing: -1.5 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 13, lineHeight: 20 },
  command: { borderRadius: 28, padding: 22, backgroundColor: c.surfaceInverse, gap: 16 },
  search: { borderRadius: 20, padding: 15, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, gap: 10 },
  metric: { flex: 1, minWidth: 140, minHeight: 114, borderRadius: 22, padding: 18, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, justifyContent: "space-between" },
  row: { minHeight: 74, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 15, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", gap: 12 },
  priority: { minHeight: 145, borderRadius: 24, padding: 20, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, justifyContent: "space-between" },
}));

function ResultRow({ title, subtitle, onPress, right }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>{title}</Text>
        {subtitle ? <Text style={s.body}>{subtitle}</Text> : null}
      </View>
      {right || <StrokeIcon icon={ArrowRight01Icon} size={18} color={colors.muted} />}
    </Pressable>
  );
}

export default function AdminDashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api("/admin/dashboard"), refetchInterval: 15000 });
  const { data: search } = useQuery({ queryKey: ["search", q], queryFn: () => api(`/search?q=${encodeURIComponent(q)}`), enabled: q.length >= 2 });

  if (isLoading || !data) return <Loading text="Control Center wird geladen…" />;

  const big = width < 700 ? 40 : 54;
  const metrics = [
    ["Neue Anfragen", data.new_leads, "/admin/crm"],
    ["Aktive Projekte", data.active_projects, "/admin/projects"],
    ["Überfällig", data.overdue_tasks, "/admin/list/tasks"],
    ["Nachrichten", data.unread_messages, "/admin/list/messages"],
  ];
  const secondary = [
    ["Termine · 7 Tage", data.upcoming_appointments, "/admin/list/calendar"],
    ["Offene Angebote", data.open_offers, "/admin/list/offers"],
    ["Offene Rechnungen", data.open_invoices, "/admin/list/invoices"],
    ["Ohne Update", data.projects_without_update, "/admin/projects"],
  ];

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 26, paddingHorizontal: width < 700 ? 16 : 30, paddingBottom: 118 }}>
      <View style={[s.shell, { gap: 18 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>OKA BAU · CONTROL CENTER</Text>
            <Text style={[s.title, { fontSize: big, lineHeight: big * 1.03, marginTop: 7 }]}>Was braucht{"\n"}heute Aufmerksamkeit?</Text>
          </View>
          <Pressable onPress={logout} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}>
            <StrokeIcon icon={Logout01Icon} size={19} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={s.command}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <StrokeIcon icon={Search01Icon} size={18} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4 }}>COMMAND SEARCH</Text>
          </View>
          <Input placeholder="Kunde, Projekt, Telefon, E-Mail, Nummer…" value={q} onChangeText={setQ} />
        </View>

        {q.length >= 2 && search ? (
          <View style={{ gap: 10 }}>
            {search.customers.map((c: any) => <ResultRow key={c.id} title={c.name} subtitle={`Kunde · ${c.email}`} onPress={() => router.push("/admin/list/customers")} />)}
            {search.projects.map((p: any) => <ResultRow key={p.id} title={`${p.number} · ${p.name}`} subtitle="Projekt" onPress={() => router.push(`/admin/project/${p.id}`)} />)}
            {search.leads.map((l: any) => <ResultRow key={l.id} title={l.name} subtitle={`Anfrage · ${l.status}`} onPress={() => router.push(`/admin/lead/${l.id}`)} />)}
            {search.offers.map((o: any) => <ResultRow key={o.id} title={o.number} subtitle="Angebot" onPress={() => router.push(`/client/offer/${o.id}`)} />)}
            {search.invoices.map((o: any) => <ResultRow key={o.id} title={o.number} subtitle="Rechnung" onPress={() => router.push("/admin/list/invoices")} />)}
            {search.documents.map((d: any) => <ResultRow key={d.id} title={d.title || d.filename} subtitle="Dokument" onPress={() => router.push(`/admin/project/${d.project_id}`)} />)}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {metrics.map(([label, value, href]: any) => (
            <Pressable key={label} style={s.metric} onPress={() => router.push(href)}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 31, letterSpacing: -1 }}>{value}</Text>
              <Text style={s.body}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.eyebrow}>PRIORITÄTEN</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {secondary.map(([label, value, href]: any) => (
            <Pressable key={label} style={s.priority} onPress={() => router.push(href)}>
              <Text style={s.eyebrow}>{label}</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 34, color: colors.onSurface, letterSpacing: -1 }}>{value}</Text>
                <StrokeIcon icon={ArrowRight01Icon} size={18} color={colors.muted} />
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={s.eyebrow}>NEUE ANFRAGEN</Text>
        <View style={{ gap: 10 }}>
          {data.recent_leads.map((l: any) => (
            <ResultRow key={l.id} title={l.name} subtitle={`${l.project_type} · ${fmtDate(l.created_at, true)}`} right={<Badge label={l.status} status={l.status} />} onPress={() => router.push(`/admin/lead/${l.id}`)} />
          ))}
        </View>

        <Text style={s.eyebrow}>NÄCHSTE TERMINE</Text>
        {!data.next_appointments.length ? <Text style={s.body}>Keine anstehenden Termine.</Text> : (
          <View style={{ gap: 10 }}>
            {data.next_appointments.map((a: any) => (
              <ResultRow key={a.id} title={`${a.type} · ${a.title}`} subtitle={`${fmtDate(a.start, true)}${a.project_number ? ` · ${a.project_number}` : ""}`} />
            ))}
          </View>
        )}

        <Text style={s.eyebrow}>LETZTE AKTIVITÄTEN</Text>
        <View style={{ gap: 10 }}>
          {data.recent_activity.slice(0, 6).map((a: any) => (
            <ResultRow key={a.id} title={`${a.action} · ${a.entity}`} subtitle={`${a.user_name} · ${fmtDate(a.created_at, true)}`} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
