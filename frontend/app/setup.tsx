import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { api, setToken } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Eyebrow, H1, Small, Caption, Button, Input, ScreenHeader, Card, useToast } from "@/src/components/ui";
import { makeStyles, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

/** Secure one-time bootstrap of the first SUPER_ADMIN. Disabled automatically once an admin exists. */
export default function Setup() {
  const s = useStyles();
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const { data } = useQuery({ queryKey: ["setup-status"], queryFn: () => api("/auth/setup/status") });
  const [f, setF] = useState({ email: "", password: "", first_name: "", last_name: "", setup_token: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api("/auth/setup", { method: "POST", json: { ...f, setup_token: f.setup_token || null } });
      setToken(r.access_token);
      await refresh();
      toast.show("Super-Admin eingerichtet", "success");
      router.replace("/admin");
    } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <View style={s.screen}>
      <ScreenHeader title="Ersteinrichtung" />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: space.xl, gap: space.lg }} testID="setup-screen">
        <Eyebrow>Sicherheit</Eyebrow>
        <H1>Ersten Super-Admin anlegen.</H1>
        {data && !data.needs_setup ? (
          <Card testID="setup-done"><Small>Die Einrichtung ist bereits abgeschlossen. Bitte melden Sie sich mit Ihrem Admin-Konto an.</Small><Button title="Zur Anmeldung" variant="light" onPress={() => router.replace("/(tabs)/mein-projekt")} testID="setup-go-login" /></Card>
        ) : (
          <>
            <Small>Es existiert noch kein Administrator. Dieses Formular funktioniert genau einmal und wird danach automatisch deaktiviert. Es werden keine Standardpasswörter ausgeliefert.</Small>
            <View style={{ flexDirection: "row", gap: space.md }}>
              <View style={{ flex: 1 }}><Input label="Vorname" value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} testID="setup-first" /></View>
              <View style={{ flex: 1 }}><Input label="Nachname" value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} testID="setup-last" /></View>
            </View>
            <Input label="E-Mail" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" testID="setup-email" />
            <Input label="Passwort (mind. 12 Zeichen)" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry testID="setup-password" />
            {data?.token_required ? <Input label="Setup-Token (aus Server-Umgebung SETUP_TOKEN)" value={f.setup_token} onChangeText={(v) => setF({ ...f, setup_token: v })} autoCapitalize="none" testID="setup-token" /> : null}
            <Button title="Super-Admin erstellen" onPress={submit} loading={busy} disabled={!f.email || f.password.length < 12 || !f.first_name} testID="setup-submit" />
            <Caption>Passwörter werden mit bcrypt gehasht. Für Produktion SETUP_TOKEN setzen und SEED_DEMO_DATA=false lassen.</Caption>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
