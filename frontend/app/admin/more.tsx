import React from "react";
import { View, ScrollView, Pressable, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUpRight01Icon, Logout01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/src/auth";
import { StrokeIcon } from "@/src/components/premium";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const ITEMS = [
  { key: "customers", title: "Kunden", sub: "Profile, Projekte, Notizen" },
  { key: "employees", title: "Mitarbeiter", sub: "Team & Rollen" },
  { key: "tasks", title: "Aufgaben", sub: "Alle Aufgaben, überfällig zuerst" },
  { key: "calendar", title: "Kalender", sub: "Termine nach Tag / Woche / Monat" },
  { key: "messages", title: "Nachrichten", sub: "Alle Projektchats" },
  { key: "offers", title: "Angebote", sub: "Status, PDF" },
  { key: "invoices", title: "Rechnungen", sub: "Offen, überfällig, bezahlt" },
  { key: "portfolio", title: "Portfolio", sub: "Öffentliche Projekte" },
  { key: "cms", title: "CMS", sub: "Hero, Leistungen, FAQ, Kontakt" },
  { key: "media", title: "Medien", sub: "Bibliothek: Bilder, PDF, GLB" },
  { key: "notifications", title: "Benachrichtigungen", sub: "In-App & E-Mail-Postausgang" },
  { key: "analytics", title: "Analytics", sub: "Leads, Conversion, Angebote" },
  { key: "activity", title: "Aktivitätsprotokoll", sub: "Wer hat was geändert" },
  { key: "settings", title: "Einstellungen", sub: "Workflow-Phasen, Nummernformate" },
];

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  shell: { width: "100%", maxWidth: 1050, alignSelf: "center" },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    color: c.onSurface,
    textTransform: "uppercase",
  },
  heading: { fontFamily: fonts.medium, color: c.onSurface, letterSpacing: -1.4 },
  body: { fontFamily: fonts.regular, color: c.muted, fontSize: 14, lineHeight: 20 },
  row: {
    minHeight: 80,
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
}));

export default function More() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { width } = useWindowDimensions();

  const pad = width < 700 ? 20 : 34;
  const headingSize = width < 700 ? 38 : 52;

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 30,
          paddingHorizontal: pad,
          paddingBottom: 80,
        }}
        testID="admin-more"
      >
        <View style={[s.shell, { gap: 14 }]}>
          <Text style={s.label}>VERWALTUNG</Text>
          <Text style={[s.heading, { fontSize: headingSize, lineHeight: headingSize * 1.05, marginBottom: 10 }]}>
            Mehr.
          </Text>

          {ITEMS.map((it) => (
            <Pressable
              key={it.key}
              onPress={() => router.push(`/admin/list/${it.key}`)}
              style={s.row}
              testID={`more-${it.key}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.semibold, color: colors.onSurface, fontSize: 16 }}>
                  {it.title}
                </Text>
                <Text style={[s.body, { marginTop: 4 }]}>{it.sub}</Text>
              </View>
              <StrokeIcon icon={ArrowUpRight01Icon} size={20} color={colors.onSurface} />
            </Pressable>
          ))}

          <Pressable
            onPress={logout}
            testID="admin-logout"
            style={[
              s.row,
              {
                marginTop: 14,
                backgroundColor: colors.surfaceInverse,
                borderColor: colors.surfaceInverse,
              },
            ]}
          >
            <StrokeIcon icon={Logout01Icon} size={20} color="#fff" />
            <Text style={{ fontFamily: fonts.semibold, color: "#fff", fontSize: 15, flex: 1 }}>
              Abmelden
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
