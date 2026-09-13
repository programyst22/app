import React, { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, fmtDate, fmtMoney } from "@/src/api";
import { useAuth, isStaff, isManagement } from "@/src/auth";
import { Eyebrow, H1, H2, H3, Body, Small, Caption, Button, Card, Input, Row, Badge, Progress, Loading, Empty, useToast, Stat } from "@/src/components/ui";
import { makeStyles, useTheme, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface }, divider: { height: 1, backgroundColor: c.divider, flex: 1 } }));

export default function MeinProjekt() {
  const { user } = useAuth();
  if (user === undefined) return <View style={{ flex: 1 }}><Loading text="Sitzung wird geprüft…" /></View>;
  if (!user) return <AuthScreen />;
  if (isStaff(user)) return <StaffHub />;
  return <ClientDashboard />;
}

function AuthScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "login") await login(f.email.trim(), f.password);
      else await register({ ...f, email: f.email.trim() });
    } catch (e: any) {
      toast.show(e.message || "Anmeldung fehlgeschlagen", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.screen}>
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.lg }}>
        <Eyebrow>Kundenportal</Eyebrow>
        <H1>{mode === "login" ? "Willkommen zurück." : "Konto erstellen."}</H1>
        <Small>Verfolgen Sie Ihr Projekt in 3D, chatten Sie mit Ihrem Projektteam und verwalten Sie Dokumente, Angebote und Rechnungen.</Small>
        {mode === "register" ? (
          <View style={{ flexDirection: "row", gap: space.md }}>
            <View style={{ flex: 1 }}><Input label="Vorname" value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} testID="register-first-name" /></View>
            <View style={{ flex: 1 }}><Input label="Nachname" value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} testID="register-last-name" /></View>
          </View>
        ) : null}
        <Input label="E-Mail" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" autoComplete="email" testID="login-email" />
        <Input label="Passwort" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry testID="login-password" />
        <Button title={mode === "login" ? "Anmelden" : "Registrieren"} onPress={submit} loading={busy} testID="login-submit" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}><View style={s.divider} /><Caption>oder</Caption><View style={s.divider} /></View>
        <Button title="Mit Google anmelden" variant="light" icon="logo-google" onPress={() => loginWithGoogle().catch((e) => toast.show(e.message, "error"))} testID="login-google" />
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: space.sm }}>
          <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} testID="toggle-auth-mode"><Small style={{ color: colors.brandPrimary, fontWeight: "600" }}>{mode === "login" ? "Neues Konto erstellen" : "Ich habe bereits ein Konto"}</Small></Pressable>
          <Pressable onPress={() => router.push("/auth/reset")} testID="forgot-password"><Small style={{ textDecorationLine: "underline" }}>Passwort vergessen?</Small></Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function StaffHub() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, gap: space.lg, paddingBottom: space.xxxl }}>
        <Eyebrow>Angemeldet als {user?.role}</Eyebrow>
        <H1>Guten Tag, {user?.first_name}</H1>
        {isManagement(user) ? (
          <Card dark onPress={() => router.push("/admin")} testID="open-admin" style={{ gap: space.sm }}>
            <Ionicons name="grid-outline" size={26} color="#FFFFFF" />
            <H2 onDark>Admin & CRM</H2>
            <Small onDark>Dashboard, Pipeline, Projekte, Angebote, 3D-Editor</Small>
          </Card>
        ) : null}
        <Card onPress={() => router.push("/employee")} testID="open-employee" style={{ gap: space.sm }}>
          <Ionicons name="hammer-outline" size={26} color="#1A1A1A" />
          <H2>Mitarbeiterportal</H2>
          <Small>Meine Projekte, Aufgaben, Termine, Bautagebuch, Uploads</Small>
        </Card>
        <Button title="Abmelden" variant="ghost" onPress={logout} testID="logout-button" />
      </ScrollView>
    </View>
  );
}

function ClientDashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["client-dashboard"], queryFn: () => api("/client/dashboard"), refetchInterval: 20000 });
  const p = data?.active_project;
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID="client-dashboard">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ gap: 4 }}>
            <Eyebrow>Kundenportal</Eyebrow>
            <H1 testID="greeting">Guten Tag, {data?.greeting_name || user?.first_name}</H1>
          </View>
          <Pressable onPress={logout} testID="logout-button" hitSlop={8} style={{ paddingTop: space.lg }}><Ionicons name="log-out-outline" size={22} color={colors.muted} /></Pressable>
        </View>
        {isLoading ? <Loading text="Projekt wird geladen…" /> : !p ? (
          <Card style={{ gap: space.md }} testID="no-project-card">
            <Empty icon="home-outline" title="Noch keine aktiven Projekte" text="Sobald OKA Bau Ihre Anfrage in ein Projekt überführt, erscheint es hier – inklusive 3D-Ansicht, Fortschritt und Chat." action={<Button title="Projekt anfragen" variant="accent" onPress={() => router.push("/anfrage")} testID="no-project-request" />} />
          </Card>
        ) : (
          <>
            <Card dark style={{ gap: space.md }} onPress={() => router.push(`/client/project/${p.id}`)} testID="active-project-card">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Eyebrow onDark>Aktives Projekt · {p.number}</Eyebrow>
                <Badge status={p.status} />
              </View>
              <H2 onDark>{p.name}</H2>
              <Small style={{ color: colors.sand }}>{p.address}</Small>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Caption onDark>Aktuelle Phase: {p.stage}</Caption><Caption onDark>{p.progress}%</Caption></View>
                <Progress value={p.progress} />
              </View>
              <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
                <Button title="Mein Projekt" variant="accent" small onPress={() => router.push(`/client/project/${p.id}`)} testID="open-project" />
                <Button title="3D ansehen" variant="ghostDark" small icon="cube-outline" onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "3D Projekt" } })} testID="open-3d" />
              </View>
            </Card>
            <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
              <Stat label="Ungelesene Nachrichten" value={p.unread_messages} accent={p.unread_messages > 0} onPress={() => router.push(`/client/chat/${p.id}`)} testID="stat-messages" />
              <Stat label="Neue Dokumente" value={p.new_documents} onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Dokumente" } })} testID="stat-documents" />
            </View>
            <Card style={{ gap: space.sm }}>
              <Row icon="person-outline" title={p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "–"} subtitle="Projektleitung" />
              <Row icon="calendar-outline" title={p.next_appointment ? `${p.next_appointment.type} · ${fmtDate(p.next_appointment.start, true)}` : "Kein Termin geplant"} subtitle="Nächster Termin" onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Termine" } })} testID="row-appointment" />
              <Row icon="newspaper-outline" title={p.latest_update?.title || "Noch keine Aktualisierung"} subtitle={p.latest_update ? fmtDate(p.latest_update.created_at) : "Letzte Aktualisierung"} onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Timeline" } })} testID="row-update" />
              {p.open_offer ? <Row icon="document-text-outline" title={`Angebot ${p.open_offer.number} · ${fmtMoney(p.open_offer.total)}`} subtitle="Offenes Angebot – jetzt ansehen" onPress={() => router.push(`/client/offer/${p.open_offer.id}`)} testID="row-offer" /> : null}
              {p.open_invoice ? <Row icon="card-outline" title={`Rechnung ${p.open_invoice.number} · ${fmtMoney(p.open_invoice.total)}`} subtitle={`Fällig ${fmtDate(p.open_invoice.due_date)}`} onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Rechnungen" } })} testID="row-invoice" /> : null}
            </Card>
            {data.projects.length > 1 ? (
              <View style={{ gap: space.sm }}>
                <Eyebrow>Weitere Projekte</Eyebrow>
                {data.projects.filter((x: any) => x.id !== p.id).map((x: any) => <Row key={x.id} title={`${x.number} · ${x.name}`} subtitle={x.stage} onPress={() => router.push(`/client/project/${x.id}`)} />)}
              </View>
            ) : null}
          </>
        )}
        <Button title="Aktualisieren" variant="ghost" small onPress={() => refetch()} testID="refresh-dashboard" />
      </ScrollView>
    </View>
  );
}
