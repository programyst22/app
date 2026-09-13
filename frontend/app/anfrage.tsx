import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, upload, PickedFile } from "@/src/api";
import { Eyebrow, H1, H2, Small, Caption, Button, Input, ScreenHeader, Card, useToast } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  typeChip: { paddingHorizontal: space.lg, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, justifyContent: "center" },
  typeChipActive: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  addThumb: { width: 84, height: 84, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  check: { width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
}));

export default function Anfrage() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/meta") });
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", postal_code: "", project_type: type || "", desired_period: "", budget: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const pick = async () => {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (req.status !== "granted") {
        toast.show(req.canAskAgain ? "Zugriff auf Fotos wird benötigt, um Bilder anzuhängen." : "Bitte erlauben Sie den Fotozugriff in den Einstellungen.", "error");
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, quality: 0.8, selectionLimit: 6 });
    if (res.canceled) return;
    setFiles((p) => [...p, ...res.assets.map((a) => ({ uri: a.uri, name: a.fileName || `upload-${Date.now()}.${a.type === "video" ? "mp4" : "jpg"}`, type: a.mimeType || (a.type === "video" ? "video/mp4" : "image/jpeg") }))].slice(0, 6));
  };

  const submit = async () => {
    if (!f.name || !f.phone || !f.email || !f.project_type) return toast.show("Bitte Name, Telefon, E-Mail und Projektart angeben.", "error");
    if (!consent) return toast.show("Bitte stimmen Sie der Datenverarbeitung zu.", "error");
    setBusy(true);
    try {
      const res = await upload("/public/request", files, { ...f, consent: "true", source: "app" });
      if (res?.ok) setDone(true);
      else throw new Error("Keine Bestätigung vom Server");
    } catch (e: any) {
      toast.show(e.message || "Übermittlung fehlgeschlagen. Bitte erneut versuchen.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <View style={s.screen}>
        <ScreenHeader title="Anfrage" />
        <View style={{ padding: space.xl, gap: space.lg }} testID="request-success">
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <H1>Vielen Dank.</H1>
          <Small style={{ fontSize: 16 }}>Ihre Anfrage wurde erfolgreich an OKA Bau übermittelt.</Small>
          <Small>Wir melden uns zeitnah telefonisch oder per E-Mail bei Ihnen.</Small>
          <Button title="Zur Startseite" onPress={() => router.replace("/(tabs)")} testID="request-success-home" />
        </View>
      </View>
    );

  return (
    <View style={s.screen}>
      <ScreenHeader title="Projektanfrage" subtitle="Kostenlos & unverbindlich" />
      <KeyboardAwareScrollView bottomOffset={32} contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID="request-form">
        <Eyebrow>Ihr Vorhaben</Eyebrow>
        <H2>Was dürfen wir für Sie tun?</H2>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
          {(meta?.services || []).map((sv: any) => (
            <Pressable key={sv.key} testID={`request-type-${sv.key}`} onPress={() => set("project_type")(sv.title)} style={[s.typeChip, f.project_type === sv.title && s.typeChipActive]}>
              <Caption style={{ color: f.project_type === sv.title ? colors.onSurfaceInverse : colors.onSurface, fontWeight: "600" }}>{sv.title}</Caption>
            </Pressable>
          ))}
        </ScrollView>
        <Input label="Name *" value={f.name} onChangeText={set("name")} testID="request-name" autoComplete="name" />
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}><Input label="Telefon *" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" testID="request-phone" /></View>
          <View style={{ flex: 1.3 }}><Input label="E-Mail *" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" testID="request-email" /></View>
        </View>
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 2 }}><Input label="Adresse" value={f.address} onChangeText={set("address")} testID="request-address" /></View>
          <View style={{ flex: 1 }}><Input label="PLZ" value={f.postal_code} onChangeText={set("postal_code")} keyboardType="number-pad" testID="request-postal" /></View>
        </View>
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}><Input label="Wunschtermin" value={f.desired_period} onChangeText={set("desired_period")} placeholder="z. B. Herbst 2026" testID="request-period" /></View>
          <View style={{ flex: 1 }}><Input label="Budget (optional)" value={f.budget} onChangeText={set("budget")} placeholder="z. B. 15.000 €" testID="request-budget" /></View>
        </View>
        <Input label="Nachricht" value={f.message} onChangeText={set("message")} multiline placeholder="Beschreiben Sie kurz Ihr Vorhaben…" testID="request-message" />
        <View style={{ gap: space.sm }}>
          <Caption style={{ letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" }}>Fotos / Videos (optional)</Caption>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            <Pressable onPress={pick} style={s.addThumb} testID="request-add-photo"><Ionicons name="camera-outline" size={24} color={colors.muted} /></Pressable>
            {files.map((x, i) => (
              <Pressable key={i} onPress={() => setFiles(files.filter((_, j) => j !== i))} testID={`request-file-${i}`}>
                <Image source={{ uri: x.uri }} style={s.thumb} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }} testID="request-consent">
          <View style={[s.check, consent && { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse }]}>{consent ? <Ionicons name="checkmark" size={18} color={colors.onSurfaceInverse} /> : null}</View>
          <Caption style={{ flex: 1 }}>Ich stimme zu, dass OKA Bau meine Angaben zur Bearbeitung der Anfrage verarbeitet (DSGVO). Die Daten werden nicht an Dritte weitergegeben.</Caption>
        </Pressable>
        <Button title="Anfrage senden" variant="accent" onPress={submit} loading={busy} testID="request-submit" />
        <Card style={{ gap: 4 }}>
          <Caption>Direkt erreichen</Caption>
          <Small style={{ fontWeight: "600" }}>+49 821 65085943 · info@okabau.de</Small>
        </Card>
      </KeyboardAwareScrollView>
    </View>
  );
}
