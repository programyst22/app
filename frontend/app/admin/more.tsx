import React from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { Eyebrow, H1, Row, Button, IconName } from "@/src/components/ui";
import { makeStyles, space } from "@/src/theme";

const useStyles = makeStyles((c) => ({ screen: { flex: 1, backgroundColor: c.surface } }));
const ITEMS: { key: string; title: string; sub: string; icon: IconName }[] = [
  { key: "customers", title: "Kunden", sub: "Profile, Projekte, Notizen", icon: "people-outline" },
  { key: "employees", title: "Mitarbeiter", sub: "Team & Rollen", icon: "person-add-outline" },
  { key: "tasks", title: "Aufgaben", sub: "Alle Aufgaben, überfällig zuerst", icon: "checkbox-outline" },
  { key: "calendar", title: "Kalender", sub: "Termine nach Tag / Woche / Monat", icon: "calendar-outline" },
  { key: "messages", title: "Nachrichten", sub: "Alle Projektchats", icon: "chatbubbles-outline" },
  { key: "offers", title: "Angebote", sub: "Status, PDF", icon: "document-text-outline" },
  { key: "invoices", title: "Rechnungen", sub: "Offen, überfällig, bezahlt", icon: "card-outline" },
  { key: "portfolio", title: "Portfolio", sub: "Öffentliche Projekte", icon: "images-outline" },
  { key: "cms", title: "CMS", sub: "Hero, Leistungen, FAQ, Kontakt", icon: "create-outline" },
  { key: "media", title: "Medien", sub: "Bibliothek: Bilder, PDF, GLB", icon: "folder-open-outline" },
  { key: "notifications", title: "Benachrichtigungen", sub: "In-App & E-Mail-Postausgang", icon: "notifications-outline" },
  { key: "analytics", title: "Analytics", sub: "Leads, Conversion, Angebote", icon: "stats-chart-outline" },
  { key: "activity", title: "Aktivitätsprotokoll", sub: "Wer hat was geändert", icon: "list-outline" },
  { key: "settings", title: "Einstellungen", sub: "Workflow-Phasen, Nummernformate", icon: "settings-outline" },
];

export default function More() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xl, paddingBottom: space.xxl }} testID="admin-more">
        <Eyebrow>Verwaltung</Eyebrow>
        <H1 style={{ marginBottom: space.md }}>Mehr</H1>
        {ITEMS.map((it) => <Row key={it.key} icon={it.icon} title={it.title} subtitle={it.sub} onPress={() => router.push(`/admin/list/${it.key}`)} testID={`more-${it.key}`} />)}
        <Button title="Abmelden" variant="ghost" onPress={logout} style={{ marginTop: space.xl }} testID="admin-logout" />
      </ScrollView>
    </View>
  );
}
