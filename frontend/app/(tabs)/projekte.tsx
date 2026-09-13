import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, abs } from "@/src/api";
import { BASlider, useSectionStyles } from "@/src/components/project-sections";
import { Eyebrow, H1, H3, Small, Caption, ChipRow, Empty, Loading } from "@/src/components/ui";
import { makeStyles, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface }, tile: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceInverse } }));

export default function Projekte() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState("Alle");
  const { data, isLoading } = useQuery({ queryKey: ["portfolio"], queryFn: () => api("/portfolio") });
  const { data: ba } = useQuery({ queryKey: ["public-before-after"], queryFn: () => api("/portfolio/before-after") });
  const bs = useSectionStyles();
  const cats = ["Alle", ...Array.from(new Set<string>((data || []).map((p: any) => p.category as string)))];
  const list = (data || []).filter((p: any) => cat === "Alle" || p.category === cat);
  const colW = (width - space.xl * 2 - space.md) / 2;
  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl, gap: space.md }}>
        <Eyebrow>Projekte</Eyebrow>
        <H1>Echte Arbeit.{"\n"}Echte Projekte.</H1>
        <Small>Ausgewählte Aufnahmen aus unserer Arbeit – keine Stockbilder.</Small>
      </View>
      <ChipRow items={cats} value={cat} onChange={setCat} testID="portfolio-filter" />
      {isLoading ? <Loading /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxxl, paddingTop: space.sm, flexDirection: "row", flexWrap: "wrap", gap: space.md }} testID="portfolio-grid">
          {list.length === 0 ? <Empty title="Noch keine Projekte" text="Veröffentlichte Projekte erscheinen hier." /> : null}
          {list.map((p: any, i: number) => {
            const big = i % 3 === 0;
            return (
              <Pressable key={p.id} testID={`portfolio-item-${i}`} onPress={() => router.push(`/portfolio/${p.id}`)} style={[s.tile, { width: big ? colW * 2 + space.md : colW }]}>
                <Image source={{ uri: abs(p.cover) }} style={{ width: "100%", height: big ? 260 : 200 }} contentFit="cover" transition={400} />
                <View style={{ padding: space.md, gap: 2 }}>
                  <Caption onDark>{p.category}</Caption>
                  <H3 onDark numberOfLines={2} style={{ fontSize: big ? 20 : 16 }}>{p.title}</H3>
                </View>
              </Pressable>
            );
          })}
          {cat === "Alle" && ba?.length ? (
            <View style={{ width: "100%", gap: space.lg, paddingTop: space.xl }} testID="public-before-after">
              <Eyebrow>Vorher / Nachher</Eyebrow>
              <H3>Verwandlung sichtbar gemacht.</H3>
              {ba.map((b: any) => <BASlider key={b.id} item={b} width={width - space.xl * 2} styles={bs} />)}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
