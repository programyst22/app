import React from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { Eyebrow, H1, Body, Caption, Button, ScreenHeader, Loading } from "@/src/components/ui";
import { makeStyles, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface }, img: { borderRadius: radius.lg, backgroundColor: c.surfaceTertiary } }));

export default function PortfolioDetail() {
  const s = useStyles();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ["portfolio"], queryFn: () => api("/portfolio") });
  const p = (data || []).find((x: any) => x.id === id);
  return (
    <View style={s.screen}>
      <ScreenHeader title={p?.category} />
      {isLoading || !p ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }} testID="portfolio-detail">
          <Image source={{ uri: p.cover }} style={[s.img, { width: width - space.xl * 2, height: 360 }]} contentFit="cover" transition={400} />
          <Eyebrow>{p.category}{p.location ? ` · ${p.location}` : ""}</Eyebrow>
          <H1>{p.title}</H1>
          <Body>{p.description}</Body>
          <Caption>Fotos & Details · {p.photos.length}</Caption>
          {p.photos.slice(1).map((u: string, i: number) => <Image key={i} source={{ uri: u }} style={[s.img, { width: width - space.xl * 2, height: 280 }]} contentFit="cover" transition={300} />)}
          <Button title="Ähnliches Projekt anfragen" variant="accent" onPress={() => router.push({ pathname: "/anfrage", params: { type: p.category } })} testID="portfolio-request" />
        </ScrollView>
      )}
    </View>
  );
}
