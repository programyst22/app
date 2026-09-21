import React, { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Call02Icon,
  Location01Icon,
  Mail01Icon,
  Menu01Icon,
  PlusSignIcon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";

import { api, abs } from "@/src/api";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";
import {
  ArrowPillButton,
  Reveal,
  RevealProvider,
  SectionLabel,
  StrokeIcon,
  WordRevealHeading,
  ZoomImage,
} from "@/src/components/premium";

const HERO_VIDEO = "https://oka-bau.eu/assets/hero.mp4";

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoText: {
    color: c.onSurfaceInverse,
    fontFamily: fonts.semibold,
    fontSize: 21,
    letterSpacing: 0.2,
  },
  navLink: {
    color: c.onSurfaceInverse,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  blackPill: {
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: c.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  blackPillText: { color: c.onSurfaceInverse, fontFamily: fonts.semibold, fontSize: 14 },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.46)",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileMenu: {
    position: "absolute",
    top: 74,
    right: 0,
    width: 280,
    borderRadius: 20,
    padding: 22,
    gap: 18,
    backgroundColor: c.surfaceInverse,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  section: { width: "100%", alignSelf: "center" },
  body: { fontFamily: fonts.regular, color: c.onSurfaceSecondary, fontSize: 16, lineHeight: 26 },
  muted: { fontFamily: fonts.regular, color: c.muted, fontSize: 16, lineHeight: 25 },
  heading: { fontFamily: fonts.medium, color: c.onSurface, letterSpacing: -1.2 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 23,
    gap: 18,
  },
  serviceNum: { width: 38, fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  serviceTitle: { fontFamily: fonts.semibold, fontSize: 20, color: c.onSurface, lineHeight: 26 },
  serviceText: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, lineHeight: 23 },
  projectCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  projectBadge: {
    position: "absolute",
    left: 28,
    top: 28,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  projectBadgeText: { fontFamily: fonts.bold, color: c.onSurface, fontSize: 11, letterSpacing: 0.5 },
  projectTitle: { fontFamily: fonts.semibold, color: c.onSurface, fontSize: 18, lineHeight: 24 },
  projectMeta: { fontFamily: fonts.regular, color: c.muted, fontSize: 14 },
  valueItem: { flex: 1, minWidth: 180, paddingVertical: 18, paddingHorizontal: 22 },
  valueNum: { fontFamily: fonts.semibold, fontSize: 38, color: c.onSurface },
  valueLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: c.onSurfaceSecondary, marginTop: 8 },
  faqItem: {
    backgroundColor: c.surfaceTertiary,
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 24,
    overflow: "hidden",
  },
  faqQuestion: { fontFamily: fonts.semibold, fontSize: 17, color: c.onSurface, flex: 1 },
  faqAnswer: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26, color: c.onSurfaceTertiary },
  processCard: {
    width: 330,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: c.border,
    gap: 18,
  },
  footerLink: { fontFamily: fonts.regular, fontSize: 15, color: c.muted },
  footerTitle: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface, letterSpacing: 1.1, textTransform: "uppercase" },
}));

function FaqItem({ item, index, open, onPress }: { item: any; index: number; open: boolean; onPress: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const r = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    r.value = withTiming(open ? 1 : 0, { duration: 350 });
  }, [open, r]);

  const rot = useAnimatedStyle(() => ({
    transform: [{ rotate: `${r.value * 45}deg` }],
  }));

  return (
    <Animated.View layout={LinearTransition.duration(350)} style={s.faqItem}>
      <Pressable onPress={onPress} testID={`faq-${index}`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Text style={s.faqQuestion}>{item.q}</Text>
          <Animated.View style={rot}>
            <StrokeIcon icon={PlusSignIcon} size={25} color={colors.onSurface} />
          </Animated.View>
        </View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(180)} style={{ paddingTop: 18, paddingBottom: 4 }}>
          <Text style={s.faqAnswer}>{item.a}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export default function Home() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: cms } = useQuery({ queryKey: ["cms"], queryFn: () => api("/cms") });
  const { data: portfolio } = useQuery({ queryKey: ["portfolio"], queryFn: () => api("/portfolio") });

  const hero = cms?.hero;
  const services = cms?.services;
  const about = cms?.about;
  const kk = cms?.katharina;
  const process = cms?.process;
  const faq = cms?.faq;
  const contact = cms?.contact;

  const navWide = width >= 1160;
  const tablet = width >= 700 && width < 1160;
  const mobile = width < 700;
  const contentPad = mobile ? 20 : tablet ? 34 : 68;
  const sectionPad = mobile ? 68 : 104;
  const sectionHeading = Math.max(30, Math.min(42, width * 0.038));
  const heroFont = Math.max(38, Math.min(80, width * (mobile ? 0.105 : 0.058)));
  const heroHeight = Math.max(height, 620);

  const player = useVideoPlayer(HERO_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try { player.play(); } catch {}
    }, 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        try { player.play(); } catch {}
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [player]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const items = Array.isArray(portfolio) ? portfolio : [];
  const coverOf = (p: any) => abs(p?.cover || p?.cover_url || p?.photos?.[0] || p?.photo_urls?.[0]);
  const projectImage1 = coverOf(items[0]);
  const projectImage2 = coverOf(items[1] || items[0]);
  const projectImage3 = coverOf(items[2] || items[0]);
  const aboutImage = about?.image ? abs(about.image) : projectImage1;

  const insightItems = useMemo(() => {
    const out: { uri: string; title: string; category: string }[] = [];
    for (const p of items) {
      const photos = p?.photos || p?.photo_urls || [];
      for (const photo of photos) {
        const uri = abs(photo);
        if (uri) out.push({ uri, title: p.title, category: p.category });
        if (out.length >= 4) return out;
      }
      const cover = coverOf(p);
      if (cover) out.push({ uri: cover, title: p.title, category: p.category });
      if (out.length >= 4) break;
    }
    return out;
  }, [items]);

  const values = [
    ["01", "KLARE ABSTIMMUNG"],
    ["02", "SAUBERE AUSFÜHRUNG"],
    ["03", "EIN ANSPRECHPARTNER"],
    ["04", "TRANSPARENTER ABLAUF"],
  ];

  const navLinks = [
    ["Leistungen", "/(tabs)/leistungen"],
    ["Projekte", "/(tabs)/projekte"],
    ["Über uns", "/"],
    ["Kontakt", "/(tabs)/kontakt"],
  ] as const;

  return (
    <View style={s.screen}>
      <RevealProvider scrollY={scrollY} viewportHeight={height}>
        <View style={[s.nav, { top: insets.top + 14, paddingHorizontal: contentPad }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {cms?.brand?.logo ? (
              <Image source={{ uri: abs(cms.brand.logo) }} style={{ width: 34, height: 34 }} contentFit="contain" />
            ) : (
              <View style={{ width: 30, height: 30, borderWidth: 1.5, borderColor: "#fff", borderRadius: 10, transform: [{ rotate: "45deg" }] }} />
            )}
            <Text style={s.logoText}>OKA Bau</Text>
          </View>

          {navWide ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 34 }}>
              {navLinks.map(([label, href]) => (
                <Pressable key={label} onPress={() => href === "/" ? null : router.push(href as any)}>
                  <Text style={s.navLink}>{label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push("/(tabs)/mein-projekt")} style={s.blackPill} testID="home-login-button">
                <StrokeIcon icon={UserAccountIcon} size={18} color="#fff" />
                <Text style={s.blackPillText}>Kundenportal</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Pressable onPress={() => setMenuOpen((v) => !v)} style={s.menuButton}>
                <StrokeIcon icon={Menu01Icon} size={23} color="#fff" />
              </Pressable>
              {menuOpen ? (
                <Animated.View entering={FadeInDown.duration(250)} style={s.mobileMenu}>
                  {navLinks.map(([label, href]) => (
                    <Pressable key={label} onPress={() => { setMenuOpen(false); if (href !== "/") router.push(href as any); }}>
                      <Text style={{ color: "#fff", fontFamily: fonts.medium, fontSize: 16 }}>{label}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => { setMenuOpen(false); router.push("/(tabs)/mein-projekt"); }} style={{ backgroundColor: "#fff", minHeight: 48, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#111", fontFamily: fonts.semibold, fontSize: 14 }}>Kundenportal</Text>
                  </Pressable>
                </Animated.View>
              ) : null}
            </View>
          )}
        </View>

        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }}
          testID="home-scroll"
        >
          <View style={{ height: heroHeight, overflow: "hidden", backgroundColor: "#111" }}>
            <VideoView
              player={player}
              nativeControls={false}
              contentFit="cover"
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,.55)"]}
              locations={[0, 0.55, 1]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
              pointerEvents="none"
            />

            <View
              style={{
                position: "absolute",
                left: contentPad,
                right: contentPad,
                bottom: mobile ? 54 : 66,
                flexDirection: mobile ? "column" : "row",
                alignItems: mobile ? "stretch" : "flex-end",
                justifyContent: "space-between",
                gap: mobile ? 30 : 60,
              }}
            >
              <View style={{ flex: 1, maxWidth: 900 }}>
                {(hero?.headline || ["Räume.", "Immobilien.", "Lösungen."]).map((line: string, i: number) => (
                  <WordRevealHeading
                    key={`${line}-${i}`}
                    text={line}
                    delay={i * 70}
                    testID={`hero-headline-${i}`}
                    style={{
                      color: "#fff",
                      fontFamily: fonts.bold,
                      fontSize: heroFont,
                      lineHeight: heroFont * 1.05,
                      letterSpacing: -2.2,
                    }}
                  />
                ))}
              </View>
              <View style={{ width: mobile ? "100%" : 390, gap: 22 }}>
                <Reveal delay={180}>
                  <Text style={{ color: "rgba(255,255,255,.88)", fontFamily: fonts.medium, fontSize: 17, lineHeight: 27 }}>
                    {hero?.subtitle || "Innenausbau, Renovierung und Objektservice in Augsburg – zuverlässig aus einer Hand."}
                  </Text>
                </Reveal>
                <Reveal delay={360}>
                  <ArrowPillButton label={hero?.cta || "Projekt starten"} onPress={() => router.push("/anfrage")} testID="hero-cta" />
                </Reveal>
              </View>
            </View>
          </View>

          <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingVertical: sectionPad }]}>
            <Reveal>
              <View style={{ alignItems: "center" }}>
                <SectionLabel>Über OKA Bau</SectionLabel>
              </View>
            </Reveal>
            <View style={{ height: 18 }} />
            <WordRevealHeading
              text={about?.headline || "Sicher geplant. Sauber umgesetzt."}
              delay={70}
              style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.18, textAlign: "center" }]}
            />
            <Reveal delay={180} style={{ alignItems: "center", marginTop: 18 }}>
              <Text style={[s.muted, { maxWidth: 760, textAlign: "center" }]}>
                {about?.text || "Wir kümmern uns um die Details, damit Abläufe klar bleiben und das Ergebnis überzeugt."}
              </Text>
            </Reveal>

            {aboutImage ? (
              <Reveal delay={360} style={{ marginTop: mobile ? 54 : 88 }}>
                <ZoomImage source={{ uri: aboutImage }} style={{ width: "100%", aspectRatio: 21 / 9, borderRadius: 10 }} />
              </Reveal>
            ) : null}

            <View style={{ marginTop: mobile ? 42 : 72, flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
              {values.map(([n, label], i) => (
                <Reveal
                  key={label}
                  delay={i * 220}
                  style={[
                    s.valueItem,
                    !mobile && i < values.length - 1 ? { borderRightWidth: 1, borderRightColor: colors.border } : null,
                  ]}
                >
                  <Text style={s.valueNum}>{n}</Text>
                  <Text style={s.valueLabel}>{label}</Text>
                </Reveal>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: colors.surfaceSoft }}>
            <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingVertical: sectionPad }]}>
              <Reveal><SectionLabel>Leistungen</SectionLabel></Reveal>
              <View style={{ height: 18 }} />
              <View style={{ flexDirection: mobile ? "column" : "row", justifyContent: "space-between", gap: 30, alignItems: mobile ? "stretch" : "flex-end" }}>
                <View style={{ maxWidth: 650 }}>
                  <WordRevealHeading
                    text={services?.headline || "Was Ihr Objekt braucht. Aus einer Hand."}
                    delay={80}
                    style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.15 }]}
                  />
                </View>
                <Reveal delay={180}>
                  <Pressable onPress={() => router.push("/(tabs)/leistungen")} style={s.blackPill}>
                    <Text style={s.blackPillText}>ALLE LEISTUNGEN</Text>
                    <StrokeIcon icon={ArrowRight01Icon} size={18} color="#fff" />
                  </Pressable>
                </Reveal>
              </View>

              <View style={{ marginTop: 42 }}>
                {(services?.items || []).map((it: any, i: number) => (
                  <Reveal key={it.key || i} delay={i * 90}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/(tabs)/leistungen", params: { focus: it.key } })}
                      style={s.serviceRow}
                    >
                      <Text style={s.serviceNum}>{String(i + 1).padStart(2, "0")}</Text>
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={s.serviceTitle}>{it.title}</Text>
                        <Text style={s.serviceText}>{it.short}</Text>
                      </View>
                      <StrokeIcon icon={ArrowUpRight01Icon} size={21} color={colors.onSurface} />
                    </Pressable>
                  </Reveal>
                ))}
              </View>
            </View>
          </View>

          <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingVertical: sectionPad }]}>
            <Reveal><SectionLabel>Ausgewählte Projekte</SectionLabel></Reveal>
            <View style={{ height: 18 }} />
            <View style={{ flexDirection: mobile ? "column" : "row", justifyContent: "space-between", gap: 30, alignItems: mobile ? "stretch" : "flex-end" }}>
              <View style={{ maxWidth: 650 }}>
                <WordRevealHeading text="Echte Arbeit. Echte Projekte." delay={70} style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.15 }]} />
              </View>
              <Reveal delay={180}>
                <Pressable onPress={() => router.push("/(tabs)/projekte")} style={s.blackPill} testID="home-all-projects">
                  <Text style={s.blackPillText}>MEHR PROJEKTE</Text>
                  <StrokeIcon icon={ArrowRight01Icon} size={18} color="#fff" />
                </Pressable>
              </Reveal>
            </View>

            <View style={{ marginTop: 42, flexDirection: "row", flexWrap: "wrap", gap: 26 }}>
              {items.slice(0, 6).map((p: any, i: number) => {
                const uri = coverOf(p);
                return (
                  <Reveal
                    key={p.id || i}
                    delay={(i % 3) * 180}
                    style={{ width: mobile ? "100%" : tablet ? "48%" : "31.7%" }}
                  >
                    <Pressable onPress={() => router.push(`/portfolio/${p.id}`)} style={s.projectCard} testID={`portfolio-card-${i}`}>
                      <View style={{ padding: 14 }}>
                        {uri ? <ZoomImage source={{ uri }} style={{ width: "100%", aspectRatio: 16 / 12, borderRadius: 11 }} /> : null}
                        <View style={s.projectBadge}>
                          <Text style={s.projectBadgeText}>{String(p.category || "PROJEKT").toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={{ paddingHorizontal: 26, paddingTop: 8, paddingBottom: 26, gap: 13 }}>
                        <Text style={s.projectTitle}>{p.title}</Text>
                        <View style={{ height: 1, backgroundColor: colors.divider }} />
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
                          <Text style={s.projectMeta}>{p.location || "Augsburg"}</Text>
                          <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={colors.onSurface} />
                        </View>
                      </View>
                    </Pressable>
                  </Reveal>
                );
              })}
            </View>
          </View>

          {projectImage2 ? (
            <View style={{ minHeight: Math.max(420, Math.min(640, height * 0.62)), overflow: "hidden" }}>
              <Image source={{ uri: projectImage2 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />
              <LinearGradient
                colors={["rgba(0,0,0,.28)", "rgba(0,0,0,.15)", "rgba(0,0,0,.62)"]}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
              />
              <View style={{ flex: 1, paddingHorizontal: contentPad, paddingVertical: 54, justifyContent: "flex-end" }}>
                <View style={{ flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "flex-end", gap: 26 }}>
                  <View style={{ maxWidth: 650 }}>
                    <Reveal><SectionLabel light>IHR PROJEKT. UNSER HANDWERK.</SectionLabel></Reveal>
                    <View style={{ height: 16 }} />
                    <WordRevealHeading
                      text="Von der ersten Abstimmung bis zur sauberen Umsetzung."
                      delay={70}
                      style={{ color: "#fff", fontFamily: fonts.medium, fontSize: sectionHeading, lineHeight: sectionHeading * 1.1, letterSpacing: -1.2 }}
                    />
                  </View>
                  <Reveal delay={180}>
                    <ArrowPillButton label="Projekt starten" onPress={() => router.push("/anfrage")} />
                  </Reveal>
                </View>
              </View>
            </View>
          ) : null}

          {insightItems.length ? (
            <View style={{ backgroundColor: colors.surfaceGrey }}>
              <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingVertical: sectionPad, alignItems: "center" }]}>
                <Reveal>
                  <View style={{ backgroundColor: "#fff", borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface }}>Einblicke</Text>
                  </View>
                </Reveal>
                <View style={{ height: 20 }} />
                <WordRevealHeading text="Arbeit, die man sehen kann." delay={70} style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.15, textAlign: "center" }]} />

                <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 22, marginTop: 42 }}>
                  {insightItems.map((it, i) => (
                    <Reveal key={`${it.uri}-${i}`} delay={(i % 2) * 180} style={{ width: mobile ? "100%" : "48.8%" }}>
                      <View style={{ backgroundColor: "#fff", borderRadius: 26, padding: 11 }}>
                        <View style={{ aspectRatio: 16 / 10, borderRadius: 18, overflow: "hidden" }}>
                          <ZoomImage source={{ uri: it.uri }} style={{ width: "100%", height: "100%" }} />
                          <LinearGradient colors={["transparent", "rgba(0,0,0,.7)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                          <View style={{ position: "absolute", left: 20, right: 20, bottom: 18 }}>
                            <Text style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 18 }}>{it.title}</Text>
                            <Text style={{ color: "rgba(255,255,255,.78)", fontFamily: fonts.regular, fontSize: 13, marginTop: 4 }}>{it.category}</Text>
                          </View>
                        </View>
                      </View>
                    </Reveal>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          <View style={[s.section, { maxWidth: 1100, paddingHorizontal: contentPad, paddingVertical: sectionPad }]}>
            <Reveal style={{ alignItems: "center" }}><SectionLabel>Häufige Fragen</SectionLabel></Reveal>
            <View style={{ height: 18 }} />
            <WordRevealHeading text={faq?.headline || "Alles, was Sie wissen möchten."} delay={70} style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.15, textAlign: "center" }]} />
            <View style={{ marginTop: 42, gap: 14 }}>
              {(faq?.items || []).map((f: any, i: number) => (
                <Reveal key={f.q} delay={i * 80}>
                  <FaqItem item={f} index={i} open={faqOpen === i} onPress={() => setFaqOpen(faqOpen === i ? null : i)} />
                </Reveal>
              ))}
            </View>
          </View>

          {kk ? (
            <View style={{ backgroundColor: colors.surfaceSoft }}>
              <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingVertical: sectionPad }]}>
                <View style={{ flexDirection: mobile ? "column" : "row", gap: mobile ? 28 : 54, alignItems: "stretch" }}>
                  <Reveal style={{ flex: 1 }}>
                    <ZoomImage source={{ uri: abs(kk.image) }} style={{ width: "100%", aspectRatio: mobile ? 1 : 0.88, borderRadius: 18 }} />
                  </Reveal>
                  <View style={{ flex: 1, justifyContent: "center", gap: 22 }}>
                    <Reveal delay={180}><SectionLabel>Persönlich. Verlässlich.</SectionLabel></Reveal>
                    <WordRevealHeading text={kk.name} delay={250} style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.1 }]} />
                    <Reveal delay={360}>
                      <Text style={{ fontFamily: fonts.medium, color: colors.onSurface, fontSize: mobile ? 22 : 27, lineHeight: mobile ? 32 : 39 }}>
                        {kk.quote}
                      </Text>
                    </Reveal>
                    <Reveal delay={540}>
                      <Text style={{ fontFamily: fonts.regular, color: colors.muted, fontSize: 15 }}>{kk.title}</Text>
                    </Reveal>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          <LinearGradient colors={["#F7F7F7", "#EFEFEF"]}>
            <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingVertical: sectionPad }]}>
              <Reveal>
                <View style={{ backgroundColor: "#fff", borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18, alignSelf: "flex-start" }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface }}>So arbeiten wir</Text>
                </View>
              </Reveal>
              <View style={{ height: 18 }} />
              <WordRevealHeading text={process?.headline || "Von Ihrer Idee zum nächsten Schritt."} delay={70} style={[s.heading, { fontSize: sectionHeading, lineHeight: sectionHeading * 1.15 }]} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={350} decelerationRate="fast" style={{ marginHorizontal: -contentPad, marginTop: 36 }} contentContainerStyle={{ paddingHorizontal: contentPad, gap: 18 }}>
                {(process?.steps || []).map((st: any, i: number) => (
                  <View key={st.title} style={s.processCard}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 40, color: colors.onSurface }}>{String(i + 1).padStart(2, "0")}</Text>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 19, color: colors.onSurface }}>{st.title}</Text>
                    <Text style={s.muted}>{st.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </LinearGradient>

          {projectImage3 ? (
            <View style={{ paddingHorizontal: mobile ? 18 : 44, paddingVertical: mobile ? 20 : 44 }}>
              <View style={{ minHeight: Math.max(460, Math.min(680, height * 0.7)), borderRadius: mobile ? 24 : 40, overflow: "hidden", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
                <Image source={{ uri: projectImage3 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />
                <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(20,28,24,.45)" }} />
                <View style={{ alignItems: "center", maxWidth: 760, gap: 18 }}>
                  <WordRevealHeading text="Ihr Projekt beginnt mit einem Gespräch." delay={70} style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: sectionHeading, lineHeight: sectionHeading * 1.12, textAlign: "center" }} />
                  <Reveal delay={180}>
                    <Text style={{ color: "rgba(255,255,255,.92)", fontFamily: fonts.medium, fontSize: 17, lineHeight: 27, textAlign: "center" }}>
                      Erzählen Sie uns, was Sie vorhaben. Wir melden uns bei Ihnen.
                    </Text>
                  </Reveal>
                  <Reveal delay={360}>
                    <ArrowPillButton label="Projekt starten" onPress={() => router.push("/anfrage")} />
                  </Reveal>
                </View>
              </View>
            </View>
          ) : null}

          <View style={[s.section, { maxWidth: 1440, paddingHorizontal: contentPad, paddingTop: 70, paddingBottom: 36 }]}>
            <View style={{ flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "center", gap: 26, paddingBottom: 34 }}>
              <View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.onSurface }}>OKA Bau</Text>
                <Text style={[s.muted, { marginTop: 6 }]}>GmbH & Co. KG · Augsburg</Text>
              </View>
              <View style={{ flexDirection: mobile ? "column" : "row", gap: mobile ? 16 : 28 }}>
                <Pressable onPress={() => Linking.openURL(`tel:${String(contact?.phone || "").replace(/\s/g, "")}`)} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <StrokeIcon icon={Call02Icon} size={18} color={colors.onSurface} />
                  <Text style={s.footerLink}>{contact?.phone || "+49 821 65085943"}</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(`mailto:${contact?.email || "info@okabau.de"}`)} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <StrokeIcon icon={Mail01Icon} size={18} color={colors.onSurface} />
                  <Text style={s.footerLink}>{contact?.email || "info@okabau.de"}</Text>
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <StrokeIcon icon={Location01Icon} size={18} color={colors.onSurface} />
                  <Text style={s.footerLink}>{contact?.address || "Alfred-Nobel-Straße 9, 86156 Augsburg"}</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <View style={{ flexDirection: mobile ? "column" : "row", flexWrap: "wrap", gap: mobile ? 30 : 60, paddingVertical: 38 }}>
              <View style={{ minWidth: 170, gap: 14 }}>
                <Text style={s.footerTitle}>Navigation</Text>
                <Pressable onPress={() => router.push("/(tabs)/leistungen")}><Text style={s.footerLink}>Leistungen</Text></Pressable>
                <Pressable onPress={() => router.push("/(tabs)/projekte")}><Text style={s.footerLink}>Projekte</Text></Pressable>
                <Pressable onPress={() => router.push("/(tabs)/kontakt")}><Text style={s.footerLink}>Kontakt</Text></Pressable>
                <Pressable onPress={() => router.push("/(tabs)/mein-projekt")}><Text style={s.footerLink}>Kundenportal</Text></Pressable>
              </View>
              <View style={{ minWidth: 170, gap: 14 }}>
                <Text style={s.footerTitle}>Rechtliches</Text>
                <Pressable onPress={() => contact?.legal?.impressum && Linking.openURL(contact.legal.impressum)}><Text style={s.footerLink}>Impressum</Text></Pressable>
                <Pressable onPress={() => contact?.legal?.datenschutz && Linking.openURL(contact.legal.datenschutz)}><Text style={s.footerLink}>Datenschutz</Text></Pressable>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center", paddingTop: 26 }}>
              © OKA Bau GmbH & Co. KG
            </Text>
          </View>
        </Animated.ScrollView>
      </RevealProvider>
    </View>
  );
}
