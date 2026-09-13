import React from "react";
import { View, ScrollView, Linking, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { Eyebrow, H1, H2, Small, Button, Card, Row, Caption } from "@/src/components/ui";
import { makeStyles, useTheme, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));

export default function Kontakt() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: cms } = useQuery({ queryKey: ["cms"], queryFn: () => api("/cms") });
  const c = cms?.contact;
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.lg }}>
        <Eyebrow>{c?.eyebrow || "Ihr Projekt"}</Eyebrow>
        <H1>{c?.headline || "Lassen Sie uns darüber sprechen."}</H1>
        <Small>Sie nennen uns Objekt, Leistung und Terminrahmen. Danach klären wir den Bestand, stimmen das Angebot ab und planen die Umsetzung.</Small>
        <Card dark style={{ gap: space.md }} testID="kontakt-request-card">
          <Eyebrow onDark>Projektanfrage</Eyebrow>
          <H2 onDark>Anfrage in 2 Minuten.</H2>
          <Small style={{ color: colors.sand }}>Fotos oder Videos können Sie direkt anhängen. Wir melden uns zeitnah.</Small>
          <Button title="Projekt starten" variant="accent" onPress={() => router.push("/anfrage")} testID="kontakt-request-cta" />
        </Card>
        <View>
          <Row icon="call-outline" title={c?.phone || "+49 821 65085943"} subtitle="Telefon" onPress={() => Linking.openURL(`tel:${(c?.phone || "+4982165085943").replace(/\s/g, "")}`)} testID="kontakt-phone" />
          <Row icon="mail-outline" title={c?.email || "info@okabau.de"} subtitle="E-Mail" onPress={() => Linking.openURL(`mailto:${c?.email || "info@okabau.de"}`)} testID="kontakt-email" />
          <Row icon="location-outline" title="Alfred-Nobel-Straße 9" subtitle="86156 Augsburg" onPress={() => Linking.openURL("https://maps.google.com/?q=Alfred-Nobel-Straße+9,+86156+Augsburg")} testID="kontakt-address" />
          <Row icon="globe-outline" title="oka-bau.eu" subtitle="Website" onPress={() => Linking.openURL("https://oka-bau.eu")} testID="kontakt-web" />
        </View>
        <Caption>OKA Bau GmbH & Co. KG · Augsburg und Umgebung</Caption>
        <View style={{ flexDirection: "row", gap: space.lg }}>
          <Pressable onPress={() => Linking.openURL(c?.legal?.impressum || "https://oka-bau.eu")} testID="legal-impressum"><Caption style={{ textDecorationLine: "underline" }}>Impressum</Caption></Pressable>
          <Pressable onPress={() => Linking.openURL(c?.legal?.datenschutz || "https://oka-bau.eu")} testID="legal-datenschutz"><Caption style={{ textDecorationLine: "underline" }}>Datenschutz</Caption></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
