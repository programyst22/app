import React, { useState } from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowUpRight01Icon,
  Logout01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { api, fmtDate } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Input, Loading, Badge } from "@/src/components/ui";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", alignSelf: "center", maxWidth: 1260 },
  overline: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4,
    color: c.onSurface, textTransform: "uppercase",
  },
  heading: { fontFamily: fonts.medium, color: c.onSurface, letterSpacing: -1.5 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 21 },
  metric: {
    flex: 1, minWidth: 160, backgroundColor: c.surfaceSecondary,
    borderRadius: 18, padding: 22, borderWidth: 1, borderColor: c.border, gap: 8,
  },
  metricValue: { fontFamily: fonts.semibold, fontSize: 34, color: c.onSurface, letterSpacing: -1 },
  metricLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, lineHeight: 18 },
  sectionTitle: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3,
    color: c.onSurface, textTransform: "uppercase", marginTop: 10,
  },
  row: {
    minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surfaceSecondary, paddingHorizontal: 18, paddingVertical: 15,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  searchBox: {
    backgroundColor: c.surfaceSecondary, borderRadius: 18,
    borderWidth: 1, borderColor: c.border, padding: 14, gap: 10,
  },
}));

function ResultRow({ title, subtitle, onPress, right, testID }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={s.row} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 15 }}>{title}</Text>
        {subtitle ? <Text style={s.body}>{subtitle}</Text> : null}
      </View>
      {right || <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={colors.onSurface} />}
    </Pressable>
  );
}

export default function AdminDashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api("/admin/dashboard"),
    refetchInterval: 15000,
  });
  const { data: search } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });

  const pagePad = width < 700 ? 20 : 36;
  const headingSize = width < 700 ? 38 : 52;

  const metrics = data ? [
    ["Neue Anfragen", data.new_leads, "/admin/crm", "stat-new-leads"],
    ["Aktive Projekte", data.active_projects, "/admin/projects", "stat-active-projects"],
    ["Überfällige Aufgaben", data.overdue_tasks, "/admin/list/tasks", "stat-overdue"],
    ["Termine · 7 Tage", data.upcoming_appointments, "/admin/list/calendar", "stat-appointments"],
    ["Offene Angebote", data.open_offers, "/admin/list/offers", "stat-offers"],
    ["Offene Rechnungen", data.open_invoices, "/admin/list/invoices", "stat-invoices"],
    ["Ungelesene Nachrichten", data.unread_messages, "/admin/list/messages", "stat-messages"],
    ["Ohne Update · 7 Tage", data.projects_without_update, "/admin/projects", "stat-stale"],
  ] : [];

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingHorizontal: pagePad,
          paddingBottom: 70,
        }}
        testID="admin-dashboard"
      >
        <View style={[s.shell, { gap: 22 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.overline}>ADMIN · {user?.role}</Text>
              <Text style={[s.heading, { fontSize: headingSize, lineHeight: headingSize * 1.08, marginTop: 9 }]}>
                Dashboard.
              </Text>
              <Text style={[s.body, { fontSize: 16, lineHeight: 25, marginTop: 10 }]}>
                CRM, Projekte, Termine, Angebote und Rechnungen im Überblick.
              </Text>
            </View>
            <Pressable
              onPress={logout}
              testID="admin-logout"
              style={{
                width: 46, height: 46, borderRadius: 23,
                borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <StrokeIcon icon={Logout01Icon} size={20} color={colors.onSurface} />
            </Pressable>
          </View>

          <View style={s.searchBox}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <StrokeIcon icon={Search01Icon} size={19} color={colors.muted} />
              <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 13 }}>
                GLOBALE SUCHE
              </Text>
            </View>
            <Input
              placeholder="Kunde, Projekt, Telefon, E-Mail, Angebots- oder Rechnungsnummer…"
              value={q}
              onChangeText={setQ}
              testID="global-search"
            />
          </View>

          {q.length >= 2 && search ? (
            <View style={{ gap: 10 }} testID="search-results">
              {search.customers.map((c: any) => (
                <ResultRow key={c.id} title={c.name} subtitle={`Kunde · ${c.email}`} onPress={() => router.push("/admin/list/customers")} />
              ))}
              {search.projects.map((p: any) => (
                <ResultRow key={p.id} title={`${p.number} · ${p.name}`} subtitle="Projekt" onPress={() => router.push(`/admin/project/${p.id}`)} />
              ))}
              {search.leads.map((l: any) => (
                <ResultRow key={l.id} title={l.name} subtitle={`Anfrage · ${l.status}`} onPress={() => router.push(`/admin/lead/${l.id}`)} />
              ))}
              {search.offers.map((o: any) => (
                <ResultRow key={o.id} title={o.number} subtitle="Angebot" onPress={() => router.push(`/client/offer/${o.id}`)} />
              ))}
              {search.invoices.map((o: any) => (
                <ResultRow key={o.id} title={o.number} subtitle="Rechnung" onPress={() => router.push("/admin/list/invoices")} />
              ))}
              {search.documents.map((d: any) => (
                <ResultRow key={d.id} title={d.title || d.filename} subtitle="Dokument" onPress={() => router.push(`/admin/project/${d.project_id}`)} />
              ))}
              {!Object.values(search).some((a: any) => a.length) ? (
                <Text style={s.body}>Keine Treffer.</Text>
              ) : null}
            </View>
          ) : null}

          {isLoading || !data ? (
            <Loading />
          ) : (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                {metrics.map(([label, value, href, testID]: any) => (
                  <Pressable
                    key={label}
                    onPress={() => router.push(href)}
                    style={s.metric}
                    testID={testID}
                  >
                    <Text style={s.metricValue}>{value}</Text>
                    <Text style={s.metricLabel}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.sectionTitle}>Neueste Anfragen</Text>
              <View style={{ gap: 10 }}>
                {data.recent_leads.map((l: any) => (
                  <ResultRow
                    key={l.id}
                    title={l.name}
                    subtitle={`${l.project_type} · ${fmtDate(l.created_at, true)}`}
                    right={<Badge label={l.status} status={l.status} />}
                    onPress={() => router.push(`/admin/lead/${l.id}`)}
                    testID={`recent-lead-${l.id}`}
                  />
                ))}
              </View>

              <Text style={s.sectionTitle}>Nächste Termine</Text>
              {!data.next_appointments.length ? (
                <Text style={s.body}>Keine anstehenden Termine.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {data.next_appointments.map((a: any) => (
                    <ResultRow
                      key={a.id}
                      title={`${a.type} · ${a.title}`}
                      subtitle={`${fmtDate(a.start, true)}${a.project_number ? ` · ${a.project_number}` : ""}`}
                    />
                  ))}
                </View>
              )}

              <Text style={s.sectionTitle}>Letzte Aktivitäten</Text>
              <View style={{ gap: 10 }}>
                {data.recent_activity.map((a: any) => (
                  <ResultRow
                    key={a.id}
                    title={`${a.action} · ${a.entity}`}
                    subtitle={`${a.user_name} · ${fmtDate(a.created_at, true)}`}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
