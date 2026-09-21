import React from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar03Icon, CheckmarkSquare03Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { api, fmtDate } from "@/src/api";
import { isStaff, useAuth } from "@/src/auth";
import { Badge, Loading } from "@/src/components/ui";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 980, alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  title: { fontFamily: fonts.semibold, color: c.onSurface, letterSpacing: -1.4 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 13, lineHeight: 20 },
  hero: { borderRadius: 30, padding: 24, backgroundColor: c.surfaceInverse, gap: 18 },
  project: { borderRadius: 24, padding: 20, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, gap: 13 },
  row: { minHeight: 76, borderRadius: 20, padding: 16, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", gap: 14 },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
  stat: { flex: 1, minWidth: 105, padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,.08)", borderWidth: 1, borderColor: "rgba(255,255,255,.10)" },
}));

export default function EmployeeHome() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => api("/employee/dashboard"),
    enabled: isStaff(user),
    refetchInterval: 20000,
  });

  if (user === undefined) return <Loading />;
  if (!isStaff(user)) return <Redirect href="/(tabs)/mein-projekt" />;
  if (isLoading || !data) return <Loading text="Heute wird geladen…" />;

  const big = width < 700 ? 40 : 54;
  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 26, paddingHorizontal: width < 700 ? 16 : 30, paddingBottom: 64 }}>
      <View style={[s.shell, { gap: 18 }]}>
        <View>
          <Text style={s.eyebrow}>OKA CREW · HEUTE</Text>
          <Text style={[s.title, { fontSize: big, lineHeight: big * 1.03, marginTop: 7 }]}>Guten Tag,{"\n"}{user.first_name}.</Text>
        </View>

        <View style={s.hero}>
          <Text style={{ color: "rgba(255,255,255,.58)", fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 }}>DEIN TAG</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              [data.projects.length, "Baustellen"],
              [data.tasks.length, "Aufgaben"],
              [data.today_appointments.length, "Termine"],
              [data.unread_messages, "Nachrichten"],
            ].map(([value, label]) => (
              <View key={String(label)} style={s.stat}>
                <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -1 }}>{value}</Text>
                <Text style={{ color: "rgba(255,255,255,.58)", fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.eyebrow}>BAUSTELLEN</Text>
        {data.projects.map((p: any) => (
          <Pressable key={p.id} style={s.project} onPress={() => router.push(`/employee/project/${p.id}`)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <Text style={s.eyebrow}>{p.number}</Text>
              <Badge label={p.stage} />
            </View>
            <Text style={[s.title, { fontSize: 22, lineHeight: 27 }]}>{p.name}</Text>
            <Text style={s.body}>{p.address}</Text>
            <View style={{ height: 5, borderRadius: 999, backgroundColor: colors.surfaceSoft, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, p.progress || 0))}%`, backgroundColor: colors.brand }} />
            </View>
            <Text style={s.body}>{p.progress}% abgeschlossen</Text>
          </Pressable>
        ))}

        <Text style={s.eyebrow}>OFFENE AUFGABEN</Text>
        {!data.tasks.length ? <Text style={s.body}>Für heute ist nichts offen.</Text> : data.tasks.map((t: any) => (
          <Pressable key={t.id} style={s.row} onPress={() => router.push({ pathname: `/employee/project/${t.project_id}`, params: { tab: "Aufgaben" } })}>
            <View style={s.icon}><StrokeIcon icon={CheckmarkSquare03Icon} size={20} color={colors.onSurface} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>{t.title}</Text>
              <Text style={s.body}>{t.project_number || ""} · {fmtDate(t.due_date)} · {t.priority}</Text>
            </View>
            <Badge status={t.status} label={t.status} />
          </Pressable>
        ))}

        <Text style={s.eyebrow}>TERMINE HEUTE</Text>
        {!data.today_appointments.length ? <Text style={s.body}>Keine Termine heute.</Text> : data.today_appointments.map((a: any) => (
          <View key={a.id} style={s.row}>
            <View style={s.icon}><StrokeIcon icon={Calendar03Icon} size={20} color={colors.onSurface} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 14 }}>{a.type} · {a.title}</Text>
              <Text style={s.body}>{fmtDate(a.start, true)}{a.location ? ` · ${a.location}` : ""}</Text>
            </View>
          </View>
        ))}

        <Pressable onPress={() => refetch()} style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: colors.surfaceInverse, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <StrokeIcon icon={RefreshIcon} size={17} color="#fff" />
          <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 13 }}>Aktualisieren</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
