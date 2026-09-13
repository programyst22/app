import React, { useEffect, useRef } from "react";
import { View, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api, abs } from "@/src/api";
import { Image } from "expo-image";
import { Eyebrow, H1, H3, Small, Button, Card, Caption } from "@/src/components/ui";
import { makeStyles, useTheme, space } from "@/src/theme";

const ICONS: Record<string, any> = { innenausbau: "grid-outline", renovierung: "water-outline", boden: "layers-outline", tueren: "log-in-outline", hausmeister: "construct-outline", reinigung: "sparkles-outline" };
const DETAILS: Record<string, string[]> = {
  innenausbau: ["Trockenbauwände & Vorsatzschalen", "Decken & Abhängungen", "Verkleidungen & Spachtelarbeiten", "Dämmung im Holzbau"],
  renovierung: ["Badsanierung komplett koordiniert", "Fliesen- & Oberflächenarbeiten", "Vorbereitung bis fertiger Raum", "Renovierung im Bestand"],
  boden: ["Untergrundvorbereitung", "Verlegung von Bodenbelägen", "Leisten & Abschlüsse", "Übergänge zwischen Räumen"],
  tueren: ["Türmontage & Anpassung", "Fenstermontage", "Anschlüsse & Fugen", "Bestand und Neubau"],
  hausmeister: ["Laufende Objektbetreuung", "Kleine Instandhaltungen", "Außenbereiche & Belagsflächen", "Privat & gewerblich"],
  reinigung: ["Objektreinigung", "Baureinigung nach Abschluss", "Regelmäßige Intervalle", "Für Hausverwaltungen"],
};

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface }, iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" }, bullet: { flexDirection: "row", gap: space.sm, alignItems: "center" } }));

export default function Leistungen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { data: cms } = useQuery({ queryKey: ["cms"], queryFn: () => api("/cms") });
  const items: any[] = cms?.services?.items || [];
  const ref = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  useEffect(() => {
    if (focus && offsets.current[focus] != null) setTimeout(() => ref.current?.scrollTo({ y: offsets.current[focus] - 80, animated: true }), 200);
  }, [focus, items.length]);
  return (
    <View style={s.screen}>
      <ScrollView ref={ref} contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.lg }} testID="leistungen-scroll">
        <Eyebrow>Leistungen</Eyebrow>
        <H1>Was Ihr Objekt braucht.{"\n"}Aus einer Hand.</H1>
        <Small>Innenausbau, Renovierung und Objektservice in Augsburg – strukturiert, sauber und verlässlich.</Small>
        <View style={{ gap: space.md, paddingTop: space.md }}>
          {items.map((it, i) => (
            <View key={it.key} onLayout={(e) => (offsets.current[it.key] = e.nativeEvent.layout.y)}>
              <Card index={i} style={{ gap: space.md, borderColor: focus === it.key ? colors.brandPrimary : colors.border }} testID={`leistung-${it.key}`}>
                {it.image ? <Image source={{ uri: abs(it.image) }} style={{ width: "100%", height: 180, borderRadius: 12 }} contentFit="cover" transition={300} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <View style={s.iconWrap}><Ionicons name={ICONS[it.key] || "cube-outline"} size={22} color={colors.onBrandTertiary} /></View>
                  <View style={{ flex: 1 }}>
                    <Caption>{String(i + 1).padStart(2, "0")}</Caption>
                    <H3>{it.title}</H3>
                  </View>
                </View>
                <Small>{it.short}</Small>
                <View style={{ gap: 6 }}>
                  {(DETAILS[it.key] || []).map((d) => (
                    <View key={d} style={s.bullet}>
                      <Ionicons name="checkmark" size={16} color={colors.brandPrimary} />
                      <Small>{d}</Small>
                    </View>
                  ))}
                </View>
                <Button title="Anfrage zu dieser Leistung" variant="light" small onPress={() => router.push({ pathname: "/anfrage", params: { type: it.title } })} testID={`leistung-cta-${it.key}`} />
              </Card>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
