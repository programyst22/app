import React, { useState } from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowUpRight01Icon, UserAccountIcon } from "@hugeicons/core-free-icons";

import { api, fmtDate, fmtMoney } from "@/src/api";
import { useAuth, isStaff, isManagement } from "@/src/auth";
import {
  Eyebrow, H1, H2, Body, Small, Caption, Button, Card, Input,
  Badge, Progress, Loading, Empty, useToast
} from "@/src/components/ui";
import { ArrowPillButton, StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  divider: { height: 1, backgroundColor: c.divider, flex: 1 },
  shell: { width: "100%", alignSelf: "center", maxWidth: 1180 },
  overline: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.5,
    color: c.onSurface, textTransform: "uppercase"
  },
  heading: {
    fontFamily: fonts.medium, color: c.onSurface,
    letterSpacing: -1.4
  },
  body: {
    fontFamily: fonts.regular, color: c.muted,
    fontSize: 16, lineHeight: 26
  },
  heroCard: {
    backgroundColor: c.surfaceInverse,
    borderRadius: 26,
    padding: 28,
    gap: 20,
    overflow: "hidden",
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
  rowCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  rowTitle: { flex: 1, fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15, lineHeight: 21 },
  rowSub: { fontFamily: fonts.regular, color: c.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  portalCard: {
    borderRadius: 22,
    padding: 24,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  authCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    gap: 16,
  },
}));

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
  const { width } = useWindowDimensions();
  const { login, register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const { data: setup } = useQuery({ queryKey: ["setup-status"], queryFn: () => api("/auth/setup/status") });

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
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 36,
          paddingHorizontal: width < 700 ? 20 : 36,
          paddingBottom: 60,
          justifyContent: "center",
        }}
      >
        <View style={[s.shell, { maxWidth: 680, gap: 22 }]}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text style={s.overline}>OKA BAU · KUNDENPORTAL</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(550)}>
            <Text style={[s.heading, { fontSize: width < 700 ? 38 : 52, lineHeight: width < 700 ? 43 : 58 }]}>
              {mode === "login" ? "Willkommen zurück." : "Konto erstellen."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(600)}>
            <Text style={s.body}>
              Verfolgen Sie Ihr Projekt, chatten Sie mit Ihrem Projektteam und verwalten Sie Dokumente,
              Angebote, Rechnungen und Termine an einem Ort.
            </Text>
          </Animated.View>

          {setup?.needs_setup ? (
            <Card dark style={{ gap: space.sm }} testID="setup-hint">
              <Small onDark>Noch kein Administrator eingerichtet.</Small>
              <Button title="Ersteinrichtung starten" small onPress={() => router.push("/setup")} testID="setup-start" />
            </Card>
          ) : null}

          <Animated.View entering={FadeInDown.delay(240).duration(600)} style={s.authCard}>
            {mode === "register" ? (
              <View style={{ flexDirection: width < 560 ? "column" : "row", gap: space.md }}>
                <View style={{ flex: 1 }}><Input label="Vorname" value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} testID="register-first-name" /></View>
                <View style={{ flex: 1 }}><Input label="Nachname" value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} testID="register-last-name" /></View>
              </View>
            ) : null}

            <Input label="E-Mail" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" autoComplete="email" testID="login-email" />
            <Input label="Passwort" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry testID="login-password" />

            <Button title={mode === "login" ? "Anmelden" : "Registrieren"} onPress={submit} loading={busy} testID="login-submit" />

            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View style={s.divider} /><Caption>oder</Caption><View style={s.divider} />
            </View>

            <Button title="Mit Google anmelden" variant="light" onPress={() => loginWithGoogle().catch((e) => toast.show(e.message, "error"))} testID="login-google" />

            <View style={{ flexDirection: width < 560 ? "column" : "row", justifyContent: "space-between", gap: 12, paddingTop: 4 }}>
              <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} testID="toggle-auth-mode">
                <Small style={{ color: colors.onSurface, fontFamily: fonts.semibold }}>
                  {mode === "login" ? "Neues Konto erstellen" : "Ich habe bereits ein Konto"}
                </Small>
              </Pressable>
              <Pressable onPress={() => router.push("/auth/reset")} testID="forgot-password">
                <Small style={{ textDecorationLine: "underline" }}>Passwort vergessen?</Small>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function StaffHub() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();

  const PortalCard = ({ title, text, onPress, dark = false, testID }: any) => (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[
        s.portalCard,
        dark && { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 24, color: dark ? "#fff" : colors.onSurface }}>
            {title}
          </Text>
          <Text style={[s.body, dark && { color: "rgba(255,255,255,.72)" }]}>{text}</Text>
        </View>
        <StrokeIcon icon={ArrowUpRight01Icon} size={24} color={dark ? "#fff" : colors.onSurface} />
      </View>
    </Pressable>
  );

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: width < 700 ? 20 : 36, gap: 24, paddingBottom: 64 }}>
        <View style={s.shell}>
          <Text style={s.overline}>ANGEMELDET ALS {user?.role}</Text>
          <Text style={[s.heading, { fontSize: width < 700 ? 38 : 52, lineHeight: width < 700 ? 43 : 58, marginTop: 10 }]}>
            Guten Tag, {user?.first_name}.
          </Text>

          <View style={{ gap: 18, marginTop: 32 }}>
            {isManagement(user) ? (
              <PortalCard
                dark
                title="Admin & CRM"
                text="Dashboard, Pipeline, Projekte, Angebote, Rechnungen, Team und 3D-Editor."
                onPress={() => router.push("/admin")}
                testID="open-admin"
              />
            ) : null}
            <PortalCard
              title="Mitarbeiterportal"
              text="Meine Projekte, Aufgaben, Termine, Bautagebuch und Uploads."
              onPress={() => router.push("/employee")}
              testID="open-employee"
            />
          </View>

          <View style={{ marginTop: 26 }}>
            <Button title="Abmelden" variant="ghost" onPress={logout} testID="logout-button" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PortalRow({ title, subtitle, onPress, testID, last = false }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {onPress ? <StrokeIcon icon={ArrowUpRight01Icon} size={20} color={colors.onSurface} /> : null}
    </Pressable>
  );
}

function ClientDashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: () => api("/client/dashboard"),
    refetchInterval: 20000,
  });

  const p = data?.active_project;
  const headingSize = width < 700 ? 38 : 52;

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 34,
          paddingHorizontal: width < 700 ? 20 : 36,
          paddingBottom: 70,
        }}
        testID="client-dashboard"
      >
        <View style={[s.shell, { gap: 22 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.overline}>MEIN PROJEKT</Text>
              <Text testID="greeting" style={[s.heading, { fontSize: headingSize, lineHeight: headingSize * 1.08, marginTop: 9 }]}>
                Guten Tag, {data?.greeting_name || user?.first_name}.
              </Text>
            </View>
            <Pressable onPress={logout} testID="logout-button" hitSlop={8} style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <StrokeIcon icon={UserAccountIcon} size={21} color={colors.onSurface} />
            </Pressable>
          </View>

          {isLoading ? <Loading text="Projekt wird geladen…" /> : !p ? (
            <View style={s.portalCard} testID="no-project-card">
              <Empty
                title="Noch keine aktiven Projekte"
                text="Sobald OKA Bau Ihre Anfrage in ein Projekt überführt, erscheint es hier – inklusive Fortschritt, Dokumenten, Chat und 3D-Ansicht."
                action={<Button title="Projekt anfragen" onPress={() => router.push("/anfrage")} testID="no-project-request" />}
              />
            </View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(600)}>
                <Pressable onPress={() => router.push(`/client/project/${p.id}`)} testID="active-project-card" style={s.heroCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={{ color: "rgba(255,255,255,.7)", fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2 }}>
                      AKTIVES PROJEKT · {p.number}
                    </Text>
                    <Badge status={p.status} />
                  </View>

                  <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: width < 700 ? 30 : 38, lineHeight: width < 700 ? 35 : 43, letterSpacing: -1 }}>
                    {p.name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,.7)", fontFamily: fonts.regular, fontSize: 15 }}>{p.address}</Text>

                  <View style={{ gap: 9 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: "rgba(255,255,255,.72)", fontFamily: fonts.regular, fontSize: 13 }}>
                        Aktuelle Phase · {p.stage}
                      </Text>
                      <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 14 }}>{p.progress}%</Text>
                    </View>
                    <Progress value={p.progress} />
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    <ArrowPillButton label="Mein Projekt" onPress={() => router.push(`/client/project/${p.id}`)} />
                    <ArrowPillButton
                      label="3D Projekt"
                      onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "3D Projekt" } })}
                    />
                  </View>
                </Pressable>
              </Animated.View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                <Pressable style={s.metric} onPress={() => router.push(`/client/chat/${p.id}`)} testID="stat-messages">
                  <Text style={s.metricValue}>{p.unread_messages}</Text>
                  <Text style={s.metricLabel}>Ungelesene Nachrichten</Text>
                </Pressable>
                <Pressable style={s.metric} onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Dokumente" } })} testID="stat-documents">
                  <Text style={s.metricValue}>{p.new_documents}</Text>
                  <Text style={s.metricLabel}>Neue Dokumente</Text>
                </Pressable>
                <View style={s.metric}>
                  <Text style={s.metricValue}>{p.progress}%</Text>
                  <Text style={s.metricLabel}>Projektfortschritt</Text>
                </View>
              </View>

              <View style={s.rowCard}>
                <PortalRow
                  title={p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "–"}
                  subtitle="Projektleitung"
                />
                <PortalRow
                  title={p.next_appointment ? `${p.next_appointment.type} · ${fmtDate(p.next_appointment.start, true)}` : "Kein Termin geplant"}
                  subtitle="Nächster Termin"
                  onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Termine" } })}
                  testID="row-appointment"
                />
                <PortalRow
                  title={p.latest_update?.title || "Noch keine Aktualisierung"}
                  subtitle={p.latest_update ? fmtDate(p.latest_update.created_at) : "Letzte Aktualisierung"}
                  onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Timeline" } })}
                  testID="row-update"
                />
                {p.open_offer ? (
                  <PortalRow
                    title={`Angebot ${p.open_offer.number} · ${fmtMoney(p.open_offer.total)}`}
                    subtitle="Offenes Angebot – jetzt ansehen"
                    onPress={() => router.push(`/client/offer/${p.open_offer.id}`)}
                    testID="row-offer"
                  />
                ) : null}
                {p.open_invoice ? (
                  <PortalRow
                    title={`Rechnung ${p.open_invoice.number} · ${fmtMoney(p.open_invoice.total)}`}
                    subtitle={`Fällig ${fmtDate(p.open_invoice.due_date)}`}
                    onPress={() => router.push({ pathname: `/client/project/${p.id}`, params: { tab: "Rechnungen" } })}
                    testID="row-invoice"
                    last
                  />
                ) : null}
              </View>

              {data.projects.length > 1 ? (
                <View style={{ gap: 12 }}>
                  <Text style={s.overline}>WEITERE PROJEKTE</Text>
                  <View style={s.rowCard}>
                    {data.projects.filter((x: any) => x.id !== p.id).map((x: any, idx: number, arr: any[]) => (
                      <PortalRow
                        key={x.id}
                        title={`${x.number} · ${x.name}`}
                        subtitle={x.stage}
                        onPress={() => router.push(`/client/project/${x.id}`)}
                        last={idx === arr.length - 1}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}

          <View style={{ alignItems: "flex-start" }}>
            <Button title="Aktualisieren" variant="ghost" small onPress={() => refetch()} testID="refresh-dashboard" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
