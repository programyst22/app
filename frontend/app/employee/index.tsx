import React from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, fmtDate } from "@/src/api";
import { useAuth, isStaff } from "@/src/auth";
import { Badge, Loading, Empty, Progress } from "@/src/components/ui";
import { StrokeIcon } from "@/src/components/premium";
import {
  ArrowUpRight01Icon,
  Calendar03Icon,
  CheckmarkSquare03Icon,
  Message01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { fonts, makeStyles, useTheme, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1180, alignSelf: "center" },
  overline: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.5,
    color: c.onSurface, textTransform: "uppercase",
  },
  heading: {
    fontFamily: fonts.medium, color: c.onSurface,
    letterSpacing: -1.4,
  },
  metric: {
    flex: 1, minWidth: 150, backgroundColor: c.surfaceSecondary,
    borderRadius: 18, padding: 22, borderWidth: 1, borderColor: c.border, gap: 8,
  },
  metricValue: {
    fontFamily: fonts.semibold, fontSize: 34, color: c.onSurface, letterSpacing: -1,
  },
  metricLabel: {
    fontFamily: fonts.regular, fontSize: 13, color: c.muted, lineHeight: 18,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1, borderColor: c.border,
    borderRadius: 20, padding: 22, gap: 12,
  },
  title: {
    fontFamily: fonts.semibold, fontSize: 20,
    lineHeight: 26, color: c.onSurface,
  },
  body: {
    fontFamily: fonts.regular, fontSize: 14,
    lineHeight: 21, color: c.muted,
  },
  row: {
    minHeight: 74, backgroundColor: c.surfaceSecondary,
    borderWidth: 1, borderColor: c.border,
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  iconBubble: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: c.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: fonts.bold, fontSize: 12,
    color: c.onSurface, letterSpacing: 1.3,
    textTransform: "uppercase", marginTop: 8,
  },
}));

export default function EmployeeHome() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => api("/employee/dashboard"),
    enabled: isStaff(user),
    refetchInterval: 20000,
  });

  if (user === undefined) return <Loading />;
  if (!isStaff(user)) return <Redirect href="/(tabs)/mein-projekt" />;

  const pagePad = width < 700 ? 20 : 36;
  const headingSize = width < 700 ? 38 : 52;

  return (
    <View style={s.screen}>
      {isLoading || !data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: 42,
            paddingHorizontal: pagePad,
            paddingBottom: 70,
          }}
          testID="employee-dashboard"
        >
          <View style={[s.shell, { gap: 22 }]}>
            <View>
              <Text style={s.overline}>MITARBEITERPORTAL</Text>
              <Text
                style={[
                  s.heading,
                  { fontSize: headingSize, lineHeight: headingSize * 1.08, marginTop: 9 },
                ]}
              >
                Guten Tag, {user!.first_name}.
              </Text>
              <Text style={[s.body, { fontSize: 16, lineHeight: 25, marginTop: 12, maxWidth: 720 }]}>
                Projekte, Aufgaben, Termine und Baustellen-Updates an einem Ort.
              </Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
              <Pressable style={s.metric} onPress={() => {}} testID="emp-stat-projects">
                <Text style={s.metricValue}>{data.projects.length}</Text>
                <Text style={s.metricLabel}>Meine Projekte</Text>
              </Pressable>
              <Pressable style={s.metric} onPress={() => {}} testID="emp-stat-tasks">
                <Text style={s.metricValue}>{data.tasks.length}</Text>
                <Text style={s.metricLabel}>Offene Aufgaben</Text>
              </Pressable>
              <Pressable style={s.metric} onPress={() => {}} testID="emp-stat-appointments">
                <Text style={s.metricValue}>{data.today_appointments.length}</Text>
                <Text style={s.metricLabel}>Termine heute</Text>
              </Pressable>
              <Pressable
                style={s.metric}
                onPress={() => router.push("/admin/list/messages")}
                testID="emp-stat-messages"
              >
                <Text style={s.metricValue}>{data.unread_messages}</Text>
                <Text style={s.metricLabel}>Ungelesen</Text>
              </Pressable>
            </View>

            <Text style={s.sectionTitle}>Meine Projekte</Text>
            {!data.projects.length ? (
              <View style={s.card}>
                <Empty title="Keine zugewiesenen Projekte" />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {data.projects.map((p: any, i: number) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/employee/project/${p.id}`)}
                    style={s.card}
                    testID={`emp-project-${p.id}`}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <Text style={[s.body, { fontSize: 12, letterSpacing: 1.0, textTransform: "uppercase" }]}>
                        {p.number}
                      </Text>
                      <Badge label={p.stage} />
                    </View>
                    <Text style={s.title}>{p.name}</Text>
                    <Text style={s.body}>{p.address}</Text>
                    <Progress value={p.progress} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={s.body}>{p.progress}% Fortschritt</Text>
                      <StrokeIcon icon={ArrowUpRight01Icon} size={20} color={colors.onSurface} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={s.sectionTitle}>Meine Aufgaben</Text>
            {!data.tasks.length ? (
              <Text style={s.body}>Keine offenen Aufgaben.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {data.tasks.map((t: any) => (
                  <Pressable
                    key={t.id}
                    onPress={() =>
                      router.push({
                        pathname: `/employee/project/${t.project_id}`,
                        params: { tab: "Aufgaben" },
                      })
                    }
                    style={s.row}
                    testID={`emp-task-${t.id}`}
                  >
                    <View style={s.iconBubble}>
                      <StrokeIcon icon={CheckmarkSquare03Icon} size={20} color={colors.onSurface} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.title, { fontSize: 16, lineHeight: 21 }]}>{t.title}</Text>
                      <Text style={s.body}>
                        {t.project_number || ""} · fällig {fmtDate(t.due_date)} · {t.priority}
                      </Text>
                    </View>
                    <Badge status={t.status} label={t.status} />
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={s.sectionTitle}>Heutige Termine</Text>
            {!data.today_appointments.length ? (
              <Text style={s.body}>Keine Termine heute.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {data.today_appointments.map((a: any) => (
                  <View key={a.id} style={s.row}>
                    <View style={s.iconBubble}>
                      <StrokeIcon icon={Calendar03Icon} size={20} color={colors.onSurface} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.title, { fontSize: 16, lineHeight: 21 }]}>
                        {a.type} · {a.title}
                      </Text>
                      <Text style={s.body}>
                        {fmtDate(a.start, true)}
                        {a.location ? ` · ${a.location}` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={s.sectionTitle}>Letzte Projektupdates</Text>
            {!data.recent_updates.length ? (
              <Text style={s.body}>Noch keine Updates verfasst.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {data.recent_updates.map((u: any) => (
                  <View key={u.id} style={s.row}>
                    <View style={s.iconBubble}>
                      <StrokeIcon icon={Message01Icon} size={20} color={colors.onSurface} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.title, { fontSize: 16, lineHeight: 21 }]}>{u.title}</Text>
                      <Text style={s.body}>{fmtDate(u.created_at, true)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={() => refetch()}
              testID="emp-refresh"
              style={{
                alignSelf: "flex-start",
                minHeight: 46,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
              }}
            >
              <StrokeIcon icon={RefreshIcon} size={18} color={colors.onSurface} />
              <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>
                Aktualisieren
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
