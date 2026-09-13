import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "@/src/api";
import { HeroScene, ServiceHouse } from "@/src/three/Experiences";
import { Eyebrow, Display, H2, H3, Body, Small, Caption, Button, Card, Section, Row } from "@/src/components/ui";
import { makeStyles, useTheme, space, radius } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space.xl, zIndex: 2 },
  logo: { color: c.onSurfaceInverse, fontSize: 18, fontWeight: "800", letterSpacing: 3 },
  serviceRow: { flexDirection: "row", gap: space.lg, paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.divider, alignItems: "flex-start" },
  num: { color: c.brandPrimary, fontWeight: "700", fontSize: 13, width: 28, paddingTop: 4 },
  projCard: { width: 260, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceInverse },
  faqItem: { paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.divider, gap: space.sm },
  quote: { fontSize: 22, lineHeight: 32, fontStyle: "italic", color: c.onSurfaceInverse, letterSpacing: -0.3 },
  mediaTile: { width: 150, height: 200, borderRadius: radius.md, overflow: "hidden" },
  stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
}));

export default function Home() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [scroll, setScroll] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const { data: cms } = useQuery({ queryKey: ["cms"], queryFn: () => api("/cms") });
  const { data: portfolio } = useQuery({ queryKey: ["portfolio"], queryFn: () => api("/portfolio") });
  const hero = cms?.hero, services = cms?.services, about = cms?.about, kk = cms?.katharina, process = cms?.process, faq = cms?.faq, contact = cms?.contact;
  const heroH = Math.min(Math.max(height * 0.82, 560), 760);

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { top: insets.top + space.md }]} pointerEvents="box-none">
        <Small style={s.logo}>OKA BAU</Small>
        <Pressable testID="home-login-button" onPress={() => router.push("/(tabs)/mein-projekt")} style={{ height: 40, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.glassDark, justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
          <Caption style={{ color: colors.onSurfaceInverse, fontWeight: "600" }}>Kundenportal</Caption>
        </Pressable>
      </View>
      <ScrollView scrollEventThrottle={32} onScroll={(e) => setScroll(Math.min(1, e.nativeEvent.contentOffset.y / heroH))} contentContainerStyle={{ paddingBottom: space.xxxl }} testID="home-scroll">
        <HeroScene height={heroH} scroll={scroll}>
          <Eyebrow onDark>{hero?.eyebrow || "AUGSBURG · INNENAUSBAU · OBJEKTSERVICE"}</Eyebrow>
          <View>
            {(hero?.headline || ["Räume.", "Immobilien.", "Lösungen."]).map((l: string, i: number) => (
              <Animated.View key={l} entering={FadeInDown.delay(150 + i * 120).duration(600)}>
                <Display onDark testID={`hero-headline-${i}`}>{l}</Display>
              </Animated.View>
            ))}
          </View>
          <Body onDark style={{ opacity: 0.85, maxWidth: 420 }}>{hero?.subtitle}</Body>
          <View style={{ flexDirection: "row", gap: space.md, paddingTop: space.sm, flexWrap: "wrap" }}>
            <Button title={hero?.cta || "Projekt starten"} variant="accent" onPress={() => router.push("/anfrage")} testID="hero-cta" />
            <Button title={hero?.cta_secondary || "Leistungen ansehen"} variant="ghostDark" onPress={() => router.push("/(tabs)/leistungen")} testID="hero-cta-secondary" />
          </View>
        </HeroScene>

        <Section eyebrow={services?.eyebrow || "Leistungen"} title={services?.headline || "Was Ihr Objekt braucht. Aus einer Hand."}>
          <View>
            {(services?.items || []).map((it: any, i: number) => (
              <Pressable key={it.key} testID={`service-${it.key}`} onPress={() => router.push({ pathname: "/(tabs)/leistungen", params: { focus: it.key } })} style={s.serviceRow}>
                <Small style={s.num}>{String(i + 1).padStart(2, "0")}</Small>
                <View style={{ flex: 1, gap: 4 }}>
                  <H3>{it.title}</H3>
                  <Small>{it.short}</Small>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </Section>

        <Section eyebrow="Interaktiv" title="Tippen Sie auf das Haus.">
          <Small>Wählen Sie einen Bereich – wir zeigen Ihnen die passende Leistung.</Small>
          <ServiceHouse onOpenService={(k) => router.push({ pathname: "/(tabs)/leistungen", params: { focus: k } })} />
        </Section>

        <Section eyebrow="Ausgewählte Projekte" title="Echte Arbeit. Echte Projekte." action={<Pressable testID="home-all-projects" onPress={() => router.push("/(tabs)/projekte")}><Small style={{ color: colors.brandPrimary, fontWeight: "600" }}>Alle →</Small></Pressable>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }} style={{ marginHorizontal: -space.xl, paddingHorizontal: space.xl }}>
            {(portfolio || []).filter((p: any) => p.featured).concat((portfolio || []).filter((p: any) => !p.featured)).slice(0, 6).map((p: any, i: number) => (
              <Pressable key={p.id} testID={`portfolio-card-${i}`} onPress={() => router.push(`/portfolio/${p.id}`)} style={s.projCard}>
                <Image source={{ uri: p.cover }} style={{ width: 260, height: 300 }} contentFit="cover" transition={400} />
                <View style={{ padding: space.lg, gap: 4 }}>
                  <Caption onDark>{p.category}</Caption>
                  <H3 onDark numberOfLines={2}>{p.title}</H3>
                </View>
              </Pressable>
            ))}
            <View style={{ width: space.xl }} />
          </ScrollView>
        </Section>

        <Section eyebrow="Aus der Praxis" title="Handwerk, das sichtbar wird.">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.xl, paddingHorizontal: space.xl }}>
            {(portfolio || []).flatMap((p: any) => p.photos || []).slice(0, 12).map((u: string, i: number) => (
              <Image key={i} source={{ uri: u }} style={s.mediaTile} contentFit="cover" transition={300} />
            ))}
            <View style={{ width: space.xl }} />
          </ScrollView>
        </Section>

        <Section eyebrow={about?.eyebrow || "Über OKA Bau"} title={about?.headline}>
          <Body>{about?.text}</Body>
          <View style={{ gap: space.sm }}>
            {(about?.values || []).map((v: any, i: number) => (
              <Card key={v.title} index={i} style={{ gap: 4 }}>
                <H3>{v.title}</H3>
                <Small>{v.text}</Small>
              </Card>
            ))}
          </View>
        </Section>

        {kk ? (
          <Section>
            <Card dark style={{ padding: 0, overflow: "hidden" }} testID="katharina-card">
              <Image source={{ uri: kk.image }} style={{ width: "100%", height: 320 }} contentFit="cover" transition={500} />
              <View style={{ padding: space.xl, gap: space.md }}>
                <Small style={s.quote}>{kk.quote}</Small>
                <View>
                  <Body onDark style={{ fontWeight: "700" }}>{kk.name}</Body>
                  <Caption onDark>{kk.title}</Caption>
                </View>
              </View>
            </Card>
          </Section>
        ) : null}

        <Section eyebrow={process?.eyebrow} title={process?.headline}>
          {(process?.steps || []).map((st: any, i: number) => (
            <View key={st.title} style={{ flexDirection: "row", gap: space.lg, alignItems: "flex-start" }}>
              <View style={s.stepNum}><Caption style={{ color: colors.onSurfaceInverse, fontWeight: "700" }}>{String(i + 1).padStart(2, "0")}</Caption></View>
              <View style={{ flex: 1, gap: 2 }}>
                <H3>{st.title}</H3>
                <Small>{st.text}</Small>
              </View>
            </View>
          ))}
        </Section>

        <Section>
          <Card dark style={{ gap: space.md }} testID="request-cta-card">
            <Eyebrow onDark>Projektanfrage</Eyebrow>
            <H2 onDark>Lassen Sie uns über Ihr Vorhaben sprechen.</H2>
            <Small style={{ color: colors.sand }}>Kostenlos und unverbindlich. Wir melden uns zeitnah bei Ihnen.</Small>
            <Button title="Projekt starten" variant="accent" onPress={() => router.push("/anfrage")} testID="request-cta" />
          </Card>
        </Section>

        <Section eyebrow={faq?.eyebrow} title={faq?.headline}>
          <View>
            {(faq?.items || []).map((f: any, i: number) => (
              <Pressable key={f.q} testID={`faq-${i}`} onPress={() => setFaqOpen(faqOpen === i ? null : i)} style={s.faqItem}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.md }}>
                  <H3 style={{ flex: 1 }}>{f.q}</H3>
                  <Ionicons name={faqOpen === i ? "remove" : "add"} size={20} color={colors.onSurface} />
                </View>
                {faqOpen === i ? <Small>{f.a}</Small> : null}
              </Pressable>
            ))}
          </View>
        </Section>

        <Section eyebrow={contact?.eyebrow} title={contact?.headline}>
          <Row icon="call-outline" title={contact?.phone || ""} subtitle="Telefon" onPress={() => Linking.openURL(`tel:${(contact?.phone || "").replace(/\s/g, "")}`)} testID="contact-phone" />
          <Row icon="mail-outline" title={contact?.email || ""} subtitle="E-Mail" onPress={() => Linking.openURL(`mailto:${contact?.email}`)} testID="contact-email" />
          <Row icon="location-outline" title={contact?.address || ""} subtitle="OKA Bau GmbH & Co. KG" />
          <Caption style={{ paddingTop: space.md }}>© OKA Bau GmbH & Co. KG · Impressum · Datenschutz</Caption>
        </Section>
      </ScrollView>
    </View>
  );
}
