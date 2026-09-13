import React from "react";
import { View, ScrollView } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, fmtDate } from "@/src/api";
import { useAuth, isStaff } from "@/src/auth";
import { Eyebrow, H1, H3, Small, Caption, Badge, Card, Row, Progress, ScreenHeader, Loading, Empty, Stat } from "@/src/components/ui";
import { makeStyles, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function EmployeeHome() {
  const s = useStyles();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["employee-dashboard"], queryFn: () => api("/employee/dashboard"), enabled: isStaff(user), refetchInterval: 20000 });
  if (user === undefined) return <Loading />;
  if (!isStaff(user)) return <Redirect href="/(tabs)/mein-projekt" />;
  return (
    <View style={s.screen}>
      <ScreenHeader title="Mitarbeiterportal" subtitle={`${user.first_name} ${user.last_name}`} />
      {isLoading || !data ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID="employee-dashboard">
          <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
            <Stat label="Meine Projekte" value={data.projects.length} testID="emp-stat-projects" />
            <Stat label="Offene Aufgaben" value={data.tasks.length} accent={data.tasks.length > 0} testID="emp-stat-tasks" />
            <Stat label="Termine heute" value={data.today_appointments.length} testID="emp-stat-appointments" />
            <Stat label="Ungelesen" value={data.unread_messages} onPress={() => router.push("/admin/list/messages")} testID="emp-stat-messages" />
          </View>
          <Eyebrow>Meine Projekte</Eyebrow>
          {!data.projects.length ? <Empty icon="briefcase-outline" title="Keine zugewiesenen Projekte" /> : data.projects.map((p: any, i: number) => (
            <Card key={p.id} index={i} onPress={() => router.push(`/employee/project/${p.id}`)} style={{ gap: space.sm }} testID={`emp-project-${p.id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption>{p.number}</Caption><Badge label={p.stage} /></View>
              <H3>{p.name}</H3>
              <Small>{p.address}</Small>
              <Progress value={p.progress} />
            </Card>
          ))}
          <Eyebrow>Meine Aufgaben</Eyebrow>
          {!data.tasks.length ? <Small>Keine offenen Aufgaben.</Small> : data.tasks.map((t: any) => (
            <Row key={t.id} icon="checkbox-outline" title={t.title} subtitle={`${t.project_number || ""} · fällig ${fmtDate(t.due_date)} · ${t.priority}`} right={<Badge status={t.status} label={t.status} />} onPress={() => router.push({ pathname: `/employee/project/${t.project_id}`, params: { tab: "Aufgaben" } })} testID={`emp-task-${t.id}`} />
          ))}
          <Eyebrow>Heutige Termine</Eyebrow>
          {!data.today_appointments.length ? <Small>Keine Termine heute.</Small> : data.today_appointments.map((a: any) => <Row key={a.id} icon="calendar-outline" title={`${a.type} · ${a.title}`} subtitle={`${fmtDate(a.start, true)}${a.location ? ` · ${a.location}` : ""}`} />)}
          <Eyebrow>Meine letzten Projektupdates</Eyebrow>
          {!data.recent_updates.length ? <Small>Noch keine Updates verfasst.</Small> : data.recent_updates.map((u: any) => <Row key={u.id} icon="newspaper-outline" title={u.title} subtitle={fmtDate(u.created_at, true)} />)}
          <Small onPress={() => refetch()} style={{ textAlign: "center", textDecorationLine: "underline" }}>Aktualisieren</Small>
        </ScrollView>
      )}
    </View>
  );
}
