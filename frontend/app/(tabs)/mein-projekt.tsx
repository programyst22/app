import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowRight01Icon,
  Camera01Icon,
  Chat01Icon,
  File01Icon,
  Logout01Icon,
  Notification01Icon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";

import { abs, api, fmtDate } from "@/src/api";
import { isManagement, isStaff, useAuth } from "@/src/auth";
import { Button, Input, Loading, Small, useToast } from "@/src/components/ui";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 980, alignSelf: "center" },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: c.muted,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.semibold,
    color: c.onSurface,
    letterSpacing: -1.5,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: c.muted,
  },
  hero: {
    minHeight: 350,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: c.surfaceInverse,
  },
  heroOverlay: {
    flex: 1,
    minHeight: 350,
    padding: 24,
    justifyContent: "space-between",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.18)",
    overflow: "hidden",
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quick: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 112,
    borderRadius: 22,
    backgroundColor: c.surfaceSecondary,
    padding: 18,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: c.border,
  },
  activity: {
    borderRadius: 24,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  activityRow: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: c.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  authCard: {
    borderRadius: 28,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    padding: 22,
    gap: 15,
  },
  staffCard: {
    minHeight: 170,
    borderRadius: 28,
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: c.surfaceInverse,
  },
}));

export default function ControlHome() {
  const { user } = useAuth();
  if (user === undefined) return <Loading text="OKA CONTROL wird geladen…" />;
  if (!user) return <AuthScreen />;
  if (isStaff(user)) return <StaffHub />;
  return <ClientControl />;
}

function AuthScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
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

  const big = width < 700 ? 43 : 58;
  return (
    <View style={[s.screen, { backgroundColor: colors.surfaceInverse }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 44,
          paddingHorizontal: width < 700 ? 20 : 34,
          paddingBottom: 44,
          justifyContent: "center",
        }}
      >
        <View style={[s.shell, { maxWidth: 620, gap: 26 }]}>
          <Animated.View entering={FadeInDown.duration(450)}>
            <Text style={[s.eyebrow, { color: "rgba(255,255,255,.56)" }]}>OKA BAU · CONTROL</Text>
            <Text style={[s.title, { color: "#fff", fontSize: big, lineHeight: big * 1.02, marginTop: 12 }]}>
              Ihr Projekt.{"\n"}Jederzeit im Blick.
            </Text>
            <Text style={[s.body, { color: "rgba(255,255,255,.62)", marginTop: 18, maxWidth: 520 }]}>
              Fortschritt, Fotos, Dokumente und direkte Kommunikation mit OKA Bau – ohne Umwege.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={s.authCard}>
            {mode === "register" ? (
              <View style={{ flexDirection: width < 520 ? "column" : "row", gap: 12 }}>
                <View style={{ flex: 1 }}><Input label="Vorname" value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} /></View>
                <View style={{ flex: 1 }}><Input label="Nachname" value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} /></View>
              </View>
            ) : null}
            <Input label="E-Mail" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" />
            <Input label="Passwort" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
            <Button title={mode === "login" ? "Control öffnen" : "Konto erstellen"} onPress={submit} loading={busy} />
            <Button title="Mit Google anmelden" variant="light" onPress={() => loginWithGoogle().catch((e) => toast.show(e.message, "error"))} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
                <Small style={{ fontFamily: fonts.semibold, color: colors.onSurface }}>
                  {mode === "login" ? "Neues Konto" : "Zur Anmeldung"}
                </Small>
              </Pressable>
              <Pressable onPress={() => router.push("/auth/reset")}><Small>Passwort vergessen?</Small></Pressable>
            </View>
            {setup?.needs_setup ? <Button title="Ersteinrichtung" variant="ghost" onPress={() => router.push("/setup")} /> : null}
          </Animated.View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function StaffHub() {
  const s = useStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const big = width < 700 ? 40 : 54;
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingTop: insets.top + 34, paddingHorizontal: 20, paddingBottom: 48 }}>
      <View style={[s.shell, { gap: 18 }]}>
        <Text style={s.eyebrow}>OKA CONTROL · {user?.role}</Text>
        <Text style={[s.title, { fontSize: big, lineHeight: big * 1.03 }]}>Guten Tag,{"\n"}{user?.first_name}.</Text>
        <Text style={s.body}>Wählen Sie Ihren Arbeitsbereich. Die öffentliche Marketing-App ist nicht mehr Teil Ihres Workflows.</Text>

        {isManagement(user) ? (
          <Pressable style={s.staffCard} onPress={() => router.push("/admin")}>
            <Text style={{ color: "rgba(255,255,255,.58)", fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4 }}>MANAGEMENT</Text>
            <View>
              <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 29, letterSpacing: -1 }}>Admin & CRM</Text>
              <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: fonts.regular, fontSize: 14, marginTop: 7 }}>Pipeline, Projekte, Team, Angebote und Rechnungen.</Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable style={[s.staffCard, { backgroundColor: "#232420" }]} onPress={() => router.push("/employee")}>
          <Text style={{ color: "rgba(255,255,255,.58)", fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4 }}>BAUSTELLE</Text>
          <View>
            <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 29, letterSpacing: -1 }}>Mitarbeiter</Text>
            <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: fonts.regular, fontSize: 14, marginTop: 7 }}>Heute, Aufgaben, Baustellen, Fotos und Bautagebuch.</Text>
          </View>
        </Pressable>

        <Button title="Abmelden" variant="ghost" onPress={logout} />
      </View>
    </ScrollView>
  );
}

function ClientControl() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: () => api("/client/dashboard"),
    refetchInterval: 20000,
  });
  const p = data?.active_project;
  const projectImage = abs(p?.cover || p?.cover_url || p?.photo || p?.latest_photo);
  const big = width < 700 ? 37 : 50;

  if (isLoading) return <Loading text="Projekt wird synchronisiert…" />;

  return (
    <ScrollView
      style={s.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingHorizontal: width < 700 ? 16 : 30,
        paddingBottom: 118,
      }}
      testID="control-home"
    >
      <View style={[s.shell, { gap: 18 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={s.eyebrow}>OKA BAU · CONTROL</Text>
            <Text style={[s.title, { fontSize: big, lineHeight: big * 1.03, marginTop: 7 }]}>Guten Tag, {data?.greeting_name || user?.first_name}.</Text>
          </View>
          <Pressable style={s.icon} onPress={() => router.push("/(tabs)/profil")}>
            <StrokeIcon icon={Notification01Icon} size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        {!p ? (
          <View style={[s.hero, { minHeight: 300 }]}>
            <LinearGradient colors={["#161714", "#0B0C0C"]} style={s.heroOverlay}>
              <Text style={[s.eyebrow, { color: "rgba(255,255,255,.56)" }]}>NOCH KEIN AKTIVES PROJEKT</Text>
              <View>
                <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 34, letterSpacing: -1.2 }}>Ihr nächstes Projekt beginnt hier.</Text>
                <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginTop: 10 }}>Senden Sie Ihre Anfrage direkt an OKA Bau.</Text>
                <Pressable onPress={() => router.push("/anfrage")} style={{ marginTop: 20, alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 13 }}>
                  <Text style={{ fontFamily: fonts.semibold, color: "#0B0C0C" }}>Projekt starten</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <>
            <Pressable style={s.hero} onPress={() => router.push(`/client/project/${p.id}`)}>
              {projectImage ? <Image source={{ uri: projectImage }} style={{ position: "absolute", inset: 0 }} contentFit="cover" /> : null}
              <LinearGradient
                colors={projectImage ? ["rgba(11,12,12,.12)", "rgba(11,12,12,.92)"] : ["#292A26", "#0B0C0C"]}
                style={s.heroOverlay}
              >
                <Text style={{ color: "rgba(255,255,255,.52)", fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 }}>PROJECT PULSE</Text>\n                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <View style={s.statusPill}><Text style={{ color: "#fff", fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.1 }}>{String(p.status || "AKTIV").replaceAll("_", " ")}</Text></View>
                  <Text style={{ color: "rgba(255,255,255,.58)", fontFamily: fonts.medium, fontSize: 12 }}>{p.number}</Text>
                </View>

                <View>
                  <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: fonts.medium, fontSize: 13 }}>{p.address || "OKA Bau Projekt"}</Text>
                  <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: width < 700 ? 31 : 40, lineHeight: width < 700 ? 35 : 44, letterSpacing: -1.2, marginTop: 7 }}>{p.name}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24 }}>
                    <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: fonts.regular, fontSize: 13 }}>{p.stage || "Projekt"}</Text>
                    <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 14 }}>{p.progress || 0}%</Text>
                  </View>
                  <View style={[s.progressTrack, { marginTop: 9 }]}>
                    <View style={{ width: `${Math.max(0, Math.min(100, p.progress || 0))}%`, height: "100%", backgroundColor: colors.brand }} />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            <View style={s.quickGrid}>
              {[
                ["Verlauf", "Heute & Updates", Chat01Icon, "/(tabs)/aktivitaet"],
                ["Medien", `${p.counts?.photos || 0} Fotos`, Camera01Icon, "/(tabs)/medien"],
                ["Dateien", `${p.counts?.documents || 0} Dokumente`, File01Icon, "/(tabs)/dateien"],
              ].map(([title, sub, icon, href]: any) => (
                <Pressable key={title} style={s.quick} onPress={() => router.push(href)}>
                  <StrokeIcon icon={icon} size={21} color={colors.onSurface} />
                  <View>
                    <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 17 }}>{title}</Text>
                    <Text style={{ fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 3 }}>{sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View>
              <Text style={s.eyebrow}>JETZT WICHTIG</Text>
              <View style={[s.activity, { marginTop: 10 }]}>
                <InfoRow
                  icon={Chat01Icon}
                  title={p.latest_update?.title || "Projektstatus aktuell"}
                  subtitle={p.latest_update?.created_at ? fmtDate(p.latest_update.created_at, true) : "Keine neue Meldung"}
                  onPress={() => router.push("/(tabs)/aktivitaet")}
                />
                <InfoRow
                  icon={UserAccountIcon}
                  title={p.project_manager ? `${p.project_manager.first_name} ${p.project_manager.last_name}` : "OKA Bau Projektteam"}
                  subtitle="Projektleitung"
                  onPress={() => router.push(`/client/project/${p.id}?tab=Projektteam`)}
                />
                <InfoRow
                  icon={ArrowRight01Icon}
                  title={p.next_appointment ? `${p.next_appointment.type} · ${fmtDate(p.next_appointment.start, true)}` : "Kein Termin offen"}
                  subtitle="Nächster Schritt"
                  onPress={() => router.push(`/client/project/${p.id}?tab=Termine`)}
                  last
                />
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, title, subtitle, onPress, last = false }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={[s.activityRow, last && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={s.icon}><StrokeIcon icon={icon} size={19} color={colors.onSurface} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface }}>{title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 }}>{subtitle}</Text>
      </View>
      <StrokeIcon icon={ArrowRight01Icon} size={18} color={colors.muted} />
    </Pressable>
  );
}
