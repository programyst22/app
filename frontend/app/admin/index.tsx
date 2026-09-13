import React, { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, fmtDate } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Eyebrow, H1, Small, Caption, Row, Stat, Loading, Input, Badge } from "@/src/components/ui";
import { makeStyles, useTheme, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function AdminDashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api("/admin/dashboard"), refetchInterval: 15000 });
  const { data: search } = useQuery({ queryKey: ["search", q], queryFn: () => api(`/search?q=${encodeURIComponent(q)}`), enabled: q.length >= 2 });
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xl, gap: space.lg, paddingBottom: space.xxl }} testID="admin-dashboard">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View><Eyebrow>Admin · {user?.role}</Eyebrow><H1>Dashboard</H1></View>
          <Pressable onPress={logout} testID="admin-logout" hitSlop={8} style={{ paddingTop: space.md }}><Ionicons name="log-out-outline" size={22} color={colors.muted} /></Pressable>
        </View>
        <Input placeholder="Suche: Kunde, Projekt, Telefon, E-Mail, Angebots-/Rechnungsnummer…" value={q} onChangeText={setQ} testID="global-search" />
        {q.length >= 2 && search ? (
          <View testID="search-results">
            {search.customers.map((c: any) => <Row key={c.id} icon="person-outline" title={c.name} subtitle={`Kunde · ${c.email}`} onPress={() => router.push(`/admin/list/customers`)} />)}
            {search.projects.map((p: any) => <Row key={p.id} icon="business-outline" title={`${p.number} · ${p.name}`} subtitle="Projekt" onPress={() => router.push(`/admin/project/${p.id}`)} />)}
            {search.leads.map((l: any) => <Row key={l.id} icon="funnel-outline" title={l.name} subtitle={`Anfrage · ${l.status}`} onPress={() => router.push(`/admin/lead/${l.id}`)} />)}
            {search.offers.map((o: any) => <Row key={o.id} icon="document-text-outline" title={o.number} subtitle="Angebot" onPress={() => router.push(`/client/offer/${o.id}`)} />)}
            {search.invoices.map((o: any) => <Row key={o.id} icon="card-outline" title={o.number} subtitle="Rechnung" onPress={() => router.push(`/admin/list/invoices`)} />)}
            {search.documents.map((d: any) => <Row key={d.id} icon="document-outline" title={d.title || d.filename} subtitle="Dokument" onPress={() => router.push(`/admin/project/${d.project_id}`)} />)}
            {!Object.values(search).some((a: any) => a.length) ? <Caption>Keine Treffer.</Caption> : null}
          </View>
        ) : null}
        {isLoading || !data ? <Loading /> : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
              <Stat label="Neue Anfragen" value={data.new_leads} accent={data.new_leads > 0} onPress={() => router.push("/admin/crm")} testID="stat-new-leads" />
              <Stat label="Aktive Projekte" value={data.active_projects} onPress={() => router.push("/admin/projects")} testID="stat-active-projects" />
              <Stat label="Überfällige Aufgaben" value={data.overdue_tasks} accent={data.overdue_tasks > 0} onPress={() => router.push("/admin/list/tasks")} testID="stat-overdue" />
              <Stat label="Termine (7 Tage)" value={data.upcoming_appointments} onPress={() => router.push("/admin/list/calendar")} testID="stat-appointments" />
              <Stat label="Offene Angebote" value={data.open_offers} onPress={() => router.push("/admin/list/offers")} testID="stat-offers" />
              <Stat label="Offene Rechnungen" value={data.open_invoices} onPress={() => router.push("/admin/list/invoices")} testID="stat-invoices" />
              <Stat label="Ungelesene Nachrichten" value={data.unread_messages} onPress={() => router.push("/admin/list/messages")} testID="stat-messages" />
              <Stat label="Ohne Update (7 Tage)" value={data.projects_without_update} accent={data.projects_without_update > 0} onPress={() => router.push("/admin/projects")} testID="stat-stale" />
            </View>
            <Eyebrow>Neueste Anfragen</Eyebrow>
            {data.recent_leads.map((l: any) => <Row key={l.id} icon="funnel-outline" title={l.name} subtitle={`${l.project_type} · ${fmtDate(l.created_at, true)}`} right={<Badge label={l.status} status={l.status} />} onPress={() => router.push(`/admin/lead/${l.id}`)} testID={`recent-lead-${l.id}`} />)}
            <Eyebrow>Nächste Termine</Eyebrow>
            {!data.next_appointments.length ? <Small>Keine anstehenden Termine.</Small> : data.next_appointments.map((a: any) => <Row key={a.id} icon="calendar-outline" title={`${a.type} · ${a.title}`} subtitle={`${fmtDate(a.start, true)}${a.project_number ? ` · ${a.project_number}` : ""}`} />)}
            <Eyebrow>Letzte Aktivitäten</Eyebrow>
            {data.recent_activity.map((a: any) => <Row key={a.id} title={`${a.action} · ${a.entity}`} subtitle={`${a.user_name} · ${fmtDate(a.created_at, true)}`} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}
