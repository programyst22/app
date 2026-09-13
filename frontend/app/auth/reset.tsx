import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { api } from "@/src/api";
import { Eyebrow, H1, Small, Button, Input, ScreenHeader, useToast } from "@/src/components/ui";
import { makeStyles, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function Reset() {
  const s = useStyles();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const request = async () => {
    setBusy(true);
    try {
      await api("/auth/password-reset/request", { method: "POST", json: { email: email.trim() } });
      toast.show("Falls das Konto existiert, wurde eine E-Mail gesendet.", "success");
      setStep(2);
    } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      await api("/auth/password-reset/confirm", { method: "POST", json: { token: token.trim(), password: pw } });
      toast.show("Passwort geändert. Bitte anmelden.", "success");
      router.replace("/(tabs)/mein-projekt");
    } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <View style={s.screen}>
      <ScreenHeader title="Passwort zurücksetzen" />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <Eyebrow>Schritt {step} von 2</Eyebrow>
        <H1>{step === 1 ? "E-Mail eingeben." : "Neues Passwort."}</H1>
        {step === 1 ? (
          <>
            <Small>Wir senden Ihnen einen Code zum Zurücksetzen.</Small>
            <Input label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" testID="reset-email" />
            <Button title="Code anfordern" onPress={request} loading={busy} testID="reset-request" />
          </>
        ) : (
          <>
            <Input label="Code aus der E-Mail" value={token} onChangeText={setToken} autoCapitalize="none" testID="reset-token" />
            <Input label="Neues Passwort (min. 8 Zeichen)" value={pw} onChangeText={setPw} secureTextEntry testID="reset-password" />
            <Button title="Passwort speichern" onPress={confirm} loading={busy} testID="reset-confirm" />
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
